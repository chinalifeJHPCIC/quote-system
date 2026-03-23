/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OPENROUTER_API_KEY?: string;
  readonly VITE_OPENROUTER_MODEL?: string;
  readonly VITE_OPENROUTER_MAX_TOKENS?: string;
  readonly VITE_OPENROUTER_BASE_URL?: string;
  readonly VITE_OPENROUTER_APP_NAME?: string;
  readonly VITE_OPENROUTER_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
