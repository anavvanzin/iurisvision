import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

// SECURITY FIX 2026-04-17: Removed `define: { 'process.env.GEMINI_API_KEY': ... }`.
// Vite inlines `define` values VERBATIM into the client bundle — any build with
// GEMINI_API_KEY set in the shell environment would leak the key publicly via
// view-source. See /Users/ana/Research/docs/superpowers/audit/2026-04-17/2.1-frontend-visual.md
// (finding C-01) and 1.2-code-reviewer-ecosystem.md (finding C-01).
//
// TODO(security): The 5 components that call Gemini directly from the browser
// (ConnectionMap, KnowledgeBase, ThesisDashboard, AIAssistant, and one more)
// must be refactored to call a backend proxy. Options:
//   (a) Firebase Cloud Function at `/api/gemini` — iurisvision already uses Firebase.
//   (b) Cloudflare Worker if moving deployment.
//   (c) Deno Deploy / Vercel Edge Function.
// Until the proxy exists, Gemini calls will fail with "GEMINI_API_KEY is not set"
// in production, which is the correct behavior (fail closed, not leak key).
// Dev-time: set GEMINI_API_KEY in a local .env and access it server-side only.

export default defineConfig(({mode}) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@shared': path.resolve(__dirname, '../shared'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
