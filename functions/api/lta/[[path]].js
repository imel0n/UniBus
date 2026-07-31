// Cloudflare Pages Function: mirrors the Vite dev proxy in vite.config.js.
// Injects the DataMall AccountKey server-side so it never reaches the browser.

const UPSTREAM = 'https://datamall2.mytransport.sg/ltaodataservice'

export async function onRequestGet(context) {
  const { params, request, env } = context

  if (!env.LTA_DATAMALL_KEY) {
    return new Response(JSON.stringify({ error: 'LTA_DATAMALL_KEY is not configured' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  // params.path is the catch-all segments, e.g. ['v3', 'BusArrival'].
  const path = Array.isArray(params.path) ? params.path.join('/') : (params.path ?? '')
  const { search } = new URL(request.url)

  const upstream = await fetch(`${UPSTREAM}/${path}${search}`, {
    headers: { AccountKey: env.LTA_DATAMALL_KEY, accept: 'application/json' },
  })

  // Arrivals must never be cached — they refresh upstream every 20 s.
  const headers = new Headers(upstream.headers)
  headers.set('cache-control', 'no-store')
  headers.delete('set-cookie')

  return new Response(upstream.body, { status: upstream.status, headers })
}
