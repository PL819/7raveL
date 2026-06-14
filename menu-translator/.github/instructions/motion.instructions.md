# Motion Instructions

Use Framer Motion for subtle, functional motion.

Use motion for:
- screen transitions
- card entrance animations
- upload interactions
- loading states
- cart button appearance
- drawer/sheet transitions
- button tap feedback

Do not use motion for:
- excessive bouncing
- decorative animation overload
- distracting background effects
- slow transitions

Default screen transition:
- initial: opacity 0, y 12
- animate: opacity 1, y 0
- exit: opacity 0, y -8
- duration: 0.2s

Default tap interaction:
- whileTap: scale 0.98

Rules:
- Keep transitions between 150ms and 300ms.
- Prefer spring motion only for tactile UI.
- Respect reduced motion preferences.
- Motion should clarify state changes, not decorate them.