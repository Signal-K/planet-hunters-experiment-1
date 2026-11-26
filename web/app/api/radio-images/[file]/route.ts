/** Fixed-host recording delivery: filenames only, never arbitrary fetch URLs. */
export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(?:png|jpg|jpeg)$/i.test(file)) {
    return new Response('Invalid recording', { status: 400 })
  }
  try {
    const upstream = await fetch(`https://panoptes-uploads.zooniverse.org/subject_location/${file}`, {
      redirect: 'manual',
    })
    if (!upstream.ok) return new Response('Recording unavailable', { status: upstream.status === 404 ? 404 : 502 })
    const type = upstream.headers.get('content-type')?.split(';')[0]
    if (type !== 'image/png' && type !== 'image/jpeg') return new Response('Invalid recording image', { status: 502 })
    const bytes = await upstream.arrayBuffer()
    if (bytes.byteLength > 8 * 1024 * 1024) return new Response('Recording too large', { status: 502 })
    return new Response(bytes, { headers: {
      'Content-Type': type,
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      'X-Content-Type-Options': 'nosniff',
    } })
  } catch (error) {
    console.error('[radio-image] Delivery failed', error)
    return new Response('Recording temporarily unavailable', { status: 502, headers: { 'Cache-Control': 'no-store' } })
  }
}
