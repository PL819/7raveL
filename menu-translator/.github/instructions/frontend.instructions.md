# Frontend Instructions

Use React with TypeScript.

Architecture:
- `src/features/menu-upload` handles upload, camera capture, preview, and submit.
- `src/features/menu-browser` handles displaying translated menu categories and items.
- `src/features/cart` handles cart state, order summary, totals, and waiter view.
- `src/services/gemini` handles Gemini client and menu image analysis.
- `src/types` contains shared TypeScript types.
- `src/lib` contains small reusable helpers.

React rules:
- Prefer function components.
- Use explicit prop types.
- Keep components focused.
- Extract repeated UI into components.
- Avoid large files.
- Avoid global mutable state.
- Use `useMemo` for derived totals where useful.
- Use TanStack Query for async server/API state when appropriate.
- Do not introduce Redux.

TypeScript rules:
- Avoid `any`.
- Use discriminated unions for view state if helpful.
- Validate AI responses with Zod before trusting them.
- Keep interfaces close to the domain model.

Styling rules:
- Use Tailwind CSS.
- Use shadcn/ui primitives.
- Do not create duplicate custom versions of shadcn components.