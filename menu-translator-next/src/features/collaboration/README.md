# Collaborative Ordering

Real-time, multi-user shared cart for co-located diners. One person scans the menu, starts a session, and others join by scanning a QR code or opening a link. Every participant can add or remove items from a single shared cart that stays synchronised across all devices.

---

## Architecture Overview

```mermaid
graph TD
    subgraph Client ["Client (Browser)"]
        UI["UI Components<br/><small>SessionQrDrawer · SessionStatusBadge · JoiningSessionOverlay</small>"]
        SM["SessionSyncManager<br/><small>Adaptive polling · Visibility management</small>"]
        QR["QRCode<br/><small>qrcode npm package</small>"]
    end

    subgraph Server ["Vercel Serverless"]
        CREATE["/api/session/create"]
        JOIN["/api/session/·id·/join"]
        ACTION["/api/session/·id·/action"]
        SYNC["/api/session/·id·/sync"]
        DESTROY["/api/session/·id·/destroy"]
        SS["SessionStore"]
    end

    REDIS[("Upstash Redis")]

    UI --> SM
    UI --> QR
    SM -- "POST" --> ACTION
    SM -- "GET (poll)" --> SYNC
    UI -- "POST" --> CREATE
    UI -- "POST" --> JOIN
    UI -- "POST" --> DESTROY
    ACTION --> SS
    SYNC --> SS
    CREATE --> SS
    JOIN --> SS
    DESTROY --> SS
    SS --> REDIS
```

---

## Component Layers

### UI Components

| File | Purpose |
|------|---------|
| `SessionQrDrawer.tsx` | Bottom drawer displaying the QR code, room code pill, copy-link button, and live diner count. Opened by the host after session creation. |
| `SessionStatusBadge.tsx` | Pill-shaped badge showing connection status (colour-coded) and peer count. Tapping it re-opens the QR drawer. |
| `JoiningSessionOverlay.tsx` | Full-screen overlay shown to guests while joining — animated loading state and error state with retry. |
| `QRCode` (`components/ui/qr-code.tsx`) | Renders a QR code via the `qrcode` npm package. Accepts a URL string and renders a retina-resolution `<img>`. |

### Sync Manager

| File | Purpose |
|------|---------|
| `session-sync-manager.ts` | Single class used by **both** host and guest. Polls `GET /sync` for authoritative cart state and submits mutations via `POST /action`. Implements adaptive polling (600 ms active / 2 s idle) and page-visibility pausing. |

### API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/session/create` | POST | Creates a new session in Redis. Returns the session ID. |
| `/api/session/[id]/join` | POST | Registers a guest peer, returns full session state (menu + cart) for immediate hydration. |
| `/api/session/[id]/action` | POST | Receives a `CartActionMessage`, applies it **atomically** in Redis, returns updated cart. |
| `/api/session/[id]/sync` | GET | Returns current cart state + peer presence. Clients poll this at interval. |
| `/api/session/[id]/destroy` | POST | Deletes the session from Redis. |

### Session Store

| File | Purpose |
|------|---------|
| `session-store.ts` | Server-side Redis wrapper. Manages session CRUD, atomic cart mutations (`applyCartAction` with `actionId`-based deduplication via `SET NX`), and presence-aware sync reads (`getCartSync`). |

### Types

| File | Purpose |
|------|---------|
| `types/session.ts` | Shared type definitions: `CartActionMessage`, `CartSyncMessage`, `PeerPresenceMessage`, `SessionRole`, `SessionConnectionStatus`. |

---

## Sequence Diagrams

### 1. Session Creation + Guest Join

```mermaid
sequenceDiagram
    actor A as Person A
    participant UI_A as UI (Person A)
    participant Backend
    participant Redis
    participant UI_B as UI (Person B)
    actor B as Person B

    A->>UI_A: Tap "Start shared order"
    UI_A->>Backend: POST /api/session/create<br/>{hostPeerId, menuData, initialCart}
    Backend->>Redis: SET session:{id}
    Redis-->>Backend: OK
    Backend-->>UI_A: {sessionId}
    UI_A->>UI_A: Generate join URL, open QR drawer
    UI_A->>UI_A: Start SyncManager (polling /sync)
    UI_A-->>A: Display QR code on screen
    A->>B: Shows QR code to Person B
    B->>UI_B: Scan QR code / open link
    UI_B->>UI_B: Show JoiningSessionOverlay
    UI_B->>Backend: POST /api/session/{id}/join<br/>{peerId, peerName}
    Backend->>Redis: GET session → add peer → SET session
    Redis-->>Backend: OK
    Backend-->>UI_B: {menuData, cartItems, cartVersion, peerCount}
    UI_B->>UI_B: Hydrate menu + cart
    UI_B->>UI_B: Start SyncManager (polling /sync)

    Note over UI_A: Next poll detects peerCount increase
    UI_A->>Backend: GET /sync?version=0
    Backend->>Redis: GET session
    Redis-->>Backend: {peerCount: 2, ...}
    Backend-->>UI_A: {peerCount: 2}
    UI_A->>UI_A: Update badge → "2 diners"
```

### 2. Cart Action Flow

```mermaid
sequenceDiagram
    actor B as Person B
    participant UI_B as UI (Person B)
    participant Backend
    participant Redis
    participant UI_A as UI (Person A)
    actor A as Person A

    B->>UI_B: Tap "Add" on a menu item
    UI_B->>UI_B: signalActivity() → burst mode (600 ms)
    UI_B->>Backend: POST /action<br/>{actionId, action: "ADD", item, senderName}
    Backend->>Redis: SET NX dedup:{actionId} (60 s TTL)
    Redis-->>Backend: OK (new)
    Backend->>Redis: GET session → apply mutation → SET session
    Redis-->>Backend: OK
    Backend-->>UI_B: {cartItems, cartVersion: 1}
    UI_B->>UI_B: Apply server-confirmed cart state

    Note over UI_A: Next poll (≤ 600 ms if burst, ≤ 2 s if idle)
    UI_A->>Backend: GET /sync?version=0
    Backend->>Redis: GET session
    Redis-->>Backend: {cartItems, cartVersion: 1, peerCount: 2}
    Backend-->>UI_A: {cartItems, cartVersion: 1}
    UI_A->>UI_A: signalActivity() → version changed, enter burst mode
    UI_A->>UI_A: Re-render cart with new items

    Note over UI_B: Duplicate guard
    UI_B->>Backend: POST /action (same actionId, retried)
    Backend->>Redis: SET NX dedup:{actionId}
    Redis-->>Backend: null (already exists)
    Backend-->>UI_B: {cartItems, cartVersion: 1} (unchanged)
```

### 3. Session Teardown

```mermaid
sequenceDiagram
    actor A as Person A
    participant UI_A as UI (Person A)
    participant Backend
    participant Redis
    participant UI_B as UI (Person B)
    actor B as Person B

    A->>UI_A: Tap "End session" / close tab
    UI_A->>UI_A: SyncManager.destroy() → stop polling
    UI_A->>Backend: POST /api/session/{id}/destroy
    Backend->>Redis: DEL session:{id}
    Redis-->>Backend: OK
    Backend-->>UI_A: {success: true}

    Note over UI_B: Next poll hits a 404
    UI_B->>Backend: GET /sync?version=N
    Backend->>Redis: GET session:{id}
    Redis-->>Backend: null
    Backend-->>UI_B: 404 Session not found
    UI_B->>UI_B: onStatusChange("disconnected")
    UI_B->>UI_B: SyncManager.destroy()
```

---

## Design Decisions

### Server-authoritative over peer-to-peer

Cart mutations are applied atomically in Redis by the API route handler, not by a client-side "host" browser. This eliminates the host as a single point of failure — if Person A closes their tab, the session and cart persist in Redis for all other participants. It also avoids the need for conflict resolution (CRDTs, last-write-wins) since the server serialises all writes.

### Polling over WebSockets

The application is deployed on Vercel serverless, which has no persistent process to maintain WebSocket connections. Polling `GET /sync` at adaptive intervals (600 ms–2 s) provides adequate latency for a food-ordering UX while remaining fully compatible with serverless infrastructure. Page-visibility pausing ensures zero wasted requests when the tab is backgrounded.

### Single SyncManager for both roles

Host and guest interact identically with the server: both `POST /action` to mutate the cart and `GET /sync` to poll state. The only behavioural difference is session lifecycle (host calls `/create` and `/destroy`, guest calls `/join`). A single `SessionSyncManager` class avoids duplicated logic and makes both roles easy to reason about.

### Action deduplication

Every `CartActionMessage` carries a unique `actionId` (UUID). The server uses Redis `SET NX` with a 60-second TTL to ensure each action is applied at most once. If a client retries a failed request or a duplicate arrives via a race condition, the server returns the current cart state without re-applying the mutation.
