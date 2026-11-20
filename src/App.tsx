import { useEffect, useState } from 'react'
import './App.css'
import Calendar from './Calendar'
import Diary from './Diary'
import { diaryDate, readEntries } from './diaryData'
import type { Entry } from './diaryData'
import WeatherCard from './WeatherCard'

const tasks = { total: 5, completed: 3 }
const menu = [
  { path: '/', label: '홈' },
  { path: '/tasks', label: '할 일' },
  { path: '/diary', label: '일기' },
  { path: '/calendar', label: '캘린더' },
]

function Sprout() {
  return <span className="sprout" aria-hidden="true"><i /><i /></span>
}

export default function App() {
  const path = window.location.pathname.replace(/\/$/, '') || '/'
  const isDiary = path === '/diary' || path.startsWith('/diary/')

  let page
  if (isDiary) {
    page = <Diary key={path} path={path} />
  } else if (path === '/calendar') {
    page = <Calendar />
  } else if (path === '/tasks') {
    page = <main><h1>할 일</h1><TaskSummary /></main>
  } else {
    page = <Home />
  }

  return (
    <div className="day">
      <header className="header">
        <a className="brand" href="/"><Sprout />나의 하루</a>
        <nav aria-label="주 메뉴">
          <ul className="menu">
            {menu.map(({ path: url, label }) => (
              <li key={url}><a href={url} aria-current={(isDiary ? url === '/diary' : path === url) ? 'page' : undefined}>{label}</a></li>
            ))}
          </ul>
        </nav>
      </header>
      {page}
    </div>
  )
}

function TaskSummary() {
  return (
    <section className="card tasks" aria-labelledby="tasks-heading">
      <div className="hill" aria-hidden="true"><Sprout /></div>
      <h2 id="tasks-heading">할 일</h2>
      <p>{tasks.total}개 중 {tasks.completed}개 완료</p>
    </section>
  )
}

function RecentDiary() {
  const [entry, setEntry] = useState<Entry | null>()
  const [error, setError] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    void readEntries(controller.signal, 1).then(([latest]) => {
      if (!controller.signal.aborted) setEntry(latest ?? null)
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '최근 일기를 불러오지 못했어요.')
      }
    })
    return () => controller.abort()
  }, [])

  if (error) return <p role="alert">{error}</p>
  if (entry === undefined) return <p role="status">일기를 불러오는 중이에요.</p>
  if (!entry) return <p>아직 작성한 일기가 없어요.</p>
  return (
    <article>
      <h3><a className="home-entry" href={'/diary/' + entry.id}>{entry.title}</a></h3>
      <time dateTime={entry.date}>{diaryDate(entry.date, 'home')}</time>
      <p className="journal-preview">{entry.content}</p>
    </article>
  )
}

function Home() {
  return (
    <main>
      <h1>오늘의 하루</h1>
      <div className="cards">
        <WeatherCard />
        <TaskSummary />
        <section className="card diary" aria-labelledby="diary-heading">
          <div className="branch" aria-hidden="true"><i /><i /><i /><i /><i /><i /></div>
          <h2 id="diary-heading">최근 일기</h2>
          <RecentDiary />
        </section>
      </div>
    </main>
  )
}
