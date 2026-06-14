# Copilot Instructions

This is a browser-based React + TypeScript + Vite application called Menu Translator.

The app lets users upload or take a photo of a restaurant menu, translate it into English using Gemini, browse the translated menu, add dishes to a cart, and show an order summary to a waiter.

Use:
- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Framer Motion
- TanStack Query
- React Hook Form
- Zod
- Lucide React

UI rules:
- Use shadcn/ui components first.
- Use Framer Motion for subtle transitions and micro-interactions.
- Design mobile-first.
- Desktop should show a centred mobile app shell.
- Prioritise accessibility, loading states, empty states, and error states.
- Avoid generic dashboard UI.
- Avoid large monolithic files.

Code rules:
- Use typed props.
- Avoid any unless strictly necessary.
- Keep service logic outside UI components.
- Keep components small and composable.
- Put Gemini logic in src/services/gemini.
- Put shared types in src/types.
- Put feature UI in src/features.
