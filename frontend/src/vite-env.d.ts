/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME?: string
  // Agrega cualquier otra variable VITE_ que uses
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
