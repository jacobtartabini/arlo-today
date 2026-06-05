/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  readonly VITE_AEGIS_BASE_URL?: string;
  readonly VITE_AEGIS_APP_NAME?: string;
  readonly VITE_AEGIS_CALLBACK_PATH?: string;
  readonly VITE_AEGIS_EXPECTED_ISSUER?: string;
  readonly VITE_AEGIS_EXPECTED_AUDIENCE?: string;
  readonly VITE_ARLO_WEB_URL?: string;
  readonly VITE_MENUBAR_CALLBACK_SCHEME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
