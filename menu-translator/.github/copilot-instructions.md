# Copilot Instructions

This is a browser-based React + TypeScript + Vite application called Menu Translator.

The app lets users upload or take a photo of a restaurant menu, translate it into English using Gemini, browse the translated menu, add dishes to a cart, and show an order summary to a waiter.

The app does not include restaurant search, maps, accounts, authentication, or database features.

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
- Gemini API through a service layer

Main flow:
1. Upload or capture menu image
2. AI menu analysis
3. Translated menu browser
4. Cart/order builder
5. Waiter-friendly order summary

Code rules:
- Use typed props.
- Avoid `any` unless strictly necessary.
- Keep components small and composable.
- Keep Gemini logic in `src/services/gemini`.
- Keep shared types in `src/types`.
- Keep feature UI in `src/features`.
- Keep reusable UI primitives in `src/components/ui`.
- Do not put API logic directly inside React components.
- Prefer feature-based folders over type-based folders.

UI rules:
- Use shadcn/ui components first.
- Use Framer Motion for subtle transitions and micro-interactions.
- Design mobile-first.
- Desktop should show a centred mobile-style app shell.
- Prioritise accessibility, loading states, empty states, and error states.
- Avoid generic dashboard UI.
- Avoid unnecessary complexity.