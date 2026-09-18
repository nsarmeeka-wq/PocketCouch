/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the PocketCoach API. Empty in development, where Vite proxies
   * `/api` to the FastAPI server (see vite.config.ts). Set it when the API is
   * deployed elsewhere, e.g. `VITE_API_URL=https://api.example.com/api`.
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
