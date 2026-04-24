# TODO: Remove All Dark Mode Implementations

## Steps

- [x] 1. `src/types.ts` — Remove `Theme` type and `theme` field from `AppState`
- [x] 2. `src/store.ts` — Remove all theme-related state, actions, imports, and persistence
- [x] 3. `src/index.css` — Remove invalid `data-theme` CSS rule
- [x] 4. `src/App.tsx` — Remove theme toggle button, `toggleTheme`, and `theme`/`setTheme` usage
- [x] 5. `tailwind.config.js` — Remove `"dark"` preset and `manualistdark` custom theme
- [x] 6. Verify build compiles successfully

