/** Serve real Panoptes recordings through our own origin, without external image/CORS cache dependencies. */
export function radioImageSource(source: string): string {
  try {
    const url = new URL(source)
    const match = /^\/subject_location\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:png|jpg|jpeg))$/i.exec(url.pathname)
    if (url.protocol === 'https:' && url.hostname === 'panoptes-uploads.zooniverse.org' && match) return `/api/radio-images/${match[1]}`
  } catch { /* Existing local fixtures retain their source. */ }
  return source
}
