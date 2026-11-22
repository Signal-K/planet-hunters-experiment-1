// The one Vite build flag Minimal reads (true only under `vite` dev).
interface ImportMeta {
  readonly env: { readonly DEV: boolean }
}
declare module '*.css'
