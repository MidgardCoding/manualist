import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Expose MISTRAL_API_KEY to the browser (in addition to VITE_*) so the
  // client can call Mistral first with OpenRouter as fallback.
  // Long-term the keys should move server-side (see supabase/functions/),
  // but the current client-direct architecture requires browser access.
  envPrefix: ['VITE_', 'MISTRAL_'],
})
