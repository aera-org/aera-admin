/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.module.scss' {
  const classes: Record<string, string>
  export default classes
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_GOOGLE_CLIENT_ID: string
  readonly VITE_STORIES_ON?: string
  readonly VITE_PERSONALITY_ON?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
