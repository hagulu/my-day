const endpoint = 'https://data4library.kr/api/loanItemSrch'
const bookLimit = 3
const day = 24 * 60 * 60 * 1000
const koreaOffset = 9 * 60 * 60 * 1000

function koreanDate(timestamp) {
  return new Date(timestamp + koreaOffset).toISOString().slice(0, 10)
}

function coverUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null

  try {
    const url = new URL(value)
    if (url.protocol === 'http:') url.protocol = 'https:'
    return url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}

async function popularBooks(apiKey) {
  const today = Date.now()
  const url = new URL(endpoint)
  url.search = new URLSearchParams({
    authKey: apiKey,
    startDt: koreanDate(today - 29 * day),
    endDt: koreanDate(today),
    pageNo: '1',
    pageSize: String(bookLimit),
    format: 'json',
  })

  const upstream = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    redirect: 'manual',
  })
  if (!upstream.ok) throw new Error('Library API request failed')

  const { response } = await upstream.json()
  const docs = response?.docs ?? (Number(response?.numFound) === 0 ? [] : null)
  if (response?.error || !Array.isArray(docs)) throw new Error('Invalid library API response')

  return docs.slice(0, bookLimit).map(({ doc }, index) => {
    if (typeof doc?.bookname !== 'string' || !doc.bookname.trim()) {
      throw new Error('Invalid book record')
    }
    return {
      rank: index + 1,
      title: doc.bookname.trim(),
      author: doc.authors?.trim() || '저자 정보 없음',
      coverUrl: coverUrl(doc.bookImageURL),
    }
  })
}

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname !== '/api/books/popular') {
      return env.ASSETS.fetch(request)
    }

    if (request.method !== 'GET') {
      return Response.json({ error: 'Method not allowed' }, {
        status: 405,
        headers: { Allow: 'GET' },
      })
    }

    if (!env.LIBRARY_API_KEY) {
      return Response.json({ error: 'Popular books service unavailable' }, { status: 503 })
    }

    try {
      const books = await popularBooks(env.LIBRARY_API_KEY)
      return Response.json({ books })
    } catch {
      return Response.json({ error: 'Could not load popular books' }, { status: 502 })
    }
  },
}
