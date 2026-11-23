import { useEffect, useState } from 'react'
import './PopularBooks.css'

type Book = {
  rank: number
  title: string
  author: string
  coverUrl: string | null
}

const fallbackCover = '/book-cover-placeholder.svg'

function BookCover({ coverUrl }: { coverUrl: Book['coverUrl'] }) {
  const [failed, setFailed] = useState(false)

  return (
    <img
      src={failed ? fallbackCover : coverUrl ?? fallbackCover}
      alt=""
      loading="lazy"
      onError={coverUrl && !failed ? () => setFailed(true) : undefined}
    />
  )
}

export default function PopularBooks() {
  const [books, setBooks] = useState<Book[]>()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadBooks() {
      try {
        const response = await fetch('/api/books/popular', { signal: controller.signal })
        if (!response.ok) throw new Error('Popular books request failed')
        const data = await response.json() as { books: Book[] }
        if (!Array.isArray(data.books)) throw new Error('Invalid popular books response')
        if (!controller.signal.aborted) setBooks(data.books)
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }

    void loadBooks()
    return () => controller.abort()
  }, [])

  return (
    <section className="popular-books" aria-labelledby="popular-books-heading">
      <h2 id="popular-books-heading">인기 대출 도서 TOP 3</h2>
      {failed ? <p role="status">인기 대출 도서를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.</p>
        : !books ? <p role="status">인기 대출 도서를 불러오는 중이에요.</p>
        : books.length === 0 ? <p role="status">최근 30일간의 인기 대출 도서가 아직 없어요.</p>
        : (
          <ol className="popular-books-list" role="list">
            {books.map(book => (
              <li className="card popular-book" key={book.rank}>
                <div className="popular-book-cover">
                  <span className="popular-book-rank">{book.rank}위</span>
                  <BookCover coverUrl={book.coverUrl} />
                </div>
                <h3>{book.title}</h3>
                <p>{book.author}</p>
              </li>
            ))}
          </ol>
        )}
    </section>
  )
}
