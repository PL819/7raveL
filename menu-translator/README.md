# Menu Translator

Menu Translator is a mobile-first web app that helps users read restaurant menus they cannot understand.

Core flow:
1. Upload or take a photo of a menu.
2. Send the image to Gemini for structured extraction + translation.
3. Browse translated dishes by category.
4. Build an order cart.
5. Show a waiter-friendly order summary.

The desktop experience intentionally renders a centered phone-style shell.

## Features

- Menu image upload via file picker, drag-and-drop, or camera input.
- Input validation for image type (JPG, PNG, WebP, HEIC/HEIF) and max file size (20 MB).
- AI-powered menu analysis and translation with Gemini.
- Language preference drawer with persisted selection.
- Category-based menu browsing.
- Quantity-based cart and estimated subtotal.
- Waiter-facing summary drawer for quick ordering.
- Demo mode using local mock data (no API key required for demo flow).

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- shadcn/ui + Radix + Vaul
- Framer Motion
- TanStack Query provider setup
- Google GenAI SDK (`@google/genai`)
- Zod runtime validation for Gemini response parsing

## Getting Started

### Prerequisites

- Node.js 18+ (Node 20+ recommended)
- npm

### 1) Install dependencies

```bash
npm install
```

### 2) Configure environment variables

Create `.env.local` in the project root:

```bash
VITE_GEMINI_API_KEY=your_api_key_here
```

Get a Gemini API key from: https://aistudio.google.com/apikey

### 3) Start development server

```bash
npm run dev
```

### 4) Build for production

```bash
npm run build
```

### 5) Preview production build

```bash
npm run preview
```

## npm Scripts

- `npm run dev`: start Vite dev server.
- `npm run build`: type-check + production build.
- `npm run lint`: run ESLint.
- `npm run preview`: preview the production build locally.

## How Translation Works

1. The selected image is converted to base64 in-browser.
2. The app sends prompt + image bytes to Gemini (`gemini-3.5-flash`).
3. Gemini is instructed to return strict JSON (currency, categories, items).
4. The response is parsed and validated with Zod.
5. The validated payload is transformed into internal `MenuData` shape with generated IDs.

If Gemini returns invalid JSON or an unexpected shape, users get a friendly retry message.

## Current Language Support

- English (`en`)
- Traditional Chinese (`zh-TW`)

Language preference is stored in `localStorage` under `menu-translator:lang`.

## Project Structure

```text
src/
  app/
    providers.tsx
  features/
    menu-upload/
    menu-browser/
    cart/
  services/
    gemini/
  components/
    ui/
  lib/
  types/
```

Architecture rule of thumb:
- Keep API logic in `src/services`, not inside React UI components.
- Keep shared domain types in `src/types`.
- Keep shared utilities in `src/lib`.

## Product Notes

- Mobile-first interaction and touch targets.
- Clear loading, error, and empty states.
- Designed for tourists, travelers, and international students.
- Supports desktop by simulating a mobile app shell in the center of the viewport.

## Troubleshooting

### "Gemini API key is missing"

Ensure `.env.local` contains:

```bash
VITE_GEMINI_API_KEY=...
```

Then restart the dev server.

### "The AI returned an unreadable response"

- Retry with a clearer, well-lit photo.
- Capture the menu flat and avoid glare.
- Upload one section/page at a time for dense menus.

### Unsupported file type or large file errors

- Use JPG, PNG, WebP, or HEIC.
- Keep image size under 20 MB.
