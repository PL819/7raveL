# Architecture

Use a feature-based structure.

Main folders:
- src/features/menu-upload
- src/features/menu-browser
- src/features/cart
- src/services/gemini
- src/types
- src/lib
- src/components/ui

Rules:
- UI components live in features or components/ui.
- shadcn/ui components live in components/ui.
- Gemini API logic lives in services/gemini.
- Shared TypeScript types live in types.
- Shared helpers live in lib.
- Do not place API logic directly inside React components.
