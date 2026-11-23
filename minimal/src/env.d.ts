// The one Vite build flag Minimal reads (true only under `vite` dev).
interface ImportMeta {
  readonly env: { readonly DEV: boolean }
}
declare module '*.css'
interface ImportMeta {
  glob(pattern: string, options: { eager: true; query: string; import: string }): Record<string,unknown>
}
