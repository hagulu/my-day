import { useEffect, useState } from 'react'
import { getKoreanHolidays } from './koreanHolidays'
import { readDiaryDates } from './diaryData'
import { dateKey, readTasks } from './taskData'
import type { Task } from './taskData'
import './Calendar.css'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

type DiaryDates = Awaited<ReturnType<typeof readDiaryDates>>
type MonthResult<T> = { month: string; entries: T; error?: string }

function firstOfMonth(date: Date, offset = 0) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export default function Calendar() {
  const [month, setMonth] = useState(() => firstOfMonth(new Date()))
  const [tasks, setTasks] = useState<MonthResult<Task[]>>()
  const [diaries, setDiaries] = useState<MonthResult<DiaryDates>>()
  const year = month.getFullYear()
  const monthStart = dateKey(month)
  const monthEnd = dateKey(firstOfMonth(month, 1))
  const [holidays, setHolidays] = useState<{
    year: number
    dates: Awaited<ReturnType<typeof getKoreanHolidays>>
  }>()

  useEffect(() => {
    let active = true

    getKoreanHolidays(year).then(dates => {
      if (active) setHolidays({ year, dates })
    }).catch(() => {
      // Dates and existing entries remain available when the holiday service is unavailable.
    })

    return () => { active = false }
  }, [year])

  useEffect(() => {
    let controller: AbortController
    function loadMonth() {
      controller?.abort()
      controller = new AbortController()
      const { signal } = controller
      void readTasks(signal, monthStart, monthEnd).then(entries => {
        if (!signal.aborted) setTasks({ month: monthStart, entries })
      }).catch(() => {
        if (!signal.aborted) setTasks({ month: monthStart, entries: [], error: '캘린더의 할 일을 불러오지 못했어요.' })
      })
      void readDiaryDates(monthStart, monthEnd, signal).then(entries => {
        if (!signal.aborted) setDiaries({ month: monthStart, entries })
      }).catch(() => {
        if (!signal.aborted) setDiaries({ month: monthStart, entries: [], error: '캘린더의 일기를 불러오지 못했어요.' })
      })
    }
    function refreshAfterBack(event: PageTransitionEvent) {
      if (event.persisted) loadMonth()
    }
    loadMonth()
    window.addEventListener('pageshow', refreshAfterBack)
    return () => {
      controller.abort()
      window.removeEventListener('pageshow', refreshAfterBack)
    }
  }, [monthStart, monthEnd])

  const monthNumber = month.getMonth() + 1
  const leadingDays = month.getDay()
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const weekCount = Math.ceil((leadingDays + daysInMonth) / 7)
  const monthTasks = tasks?.month === monthStart ? tasks : undefined
  const monthDiaries = diaries?.month === monthStart ? diaries : undefined

  function moveMonth(offset: number) {
    setMonth(previous => firstOfMonth(previous, offset))
  }

  return (
    <main className="calendar-page">
      <h1>캘린더</h1>
      <section className="card calendar" aria-labelledby="calendar-month">
        <div className="calendar-toolbar">
          <button type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>
            <span aria-hidden="true">‹</span>
          </button>
          <h2 id="calendar-month" aria-live="polite">{year}년 {monthNumber}월</h2>
          <button type="button" aria-label="다음 달" onClick={() => moveMonth(1)}>
            <span aria-hidden="true">›</span>
          </button>
        </div>
        {(!monthTasks || !monthDiaries) && <p role="status">일정을 불러오는 중이에요.</p>}
        {monthTasks?.error && <p role="alert">{monthTasks.error}</p>}
        {monthDiaries?.error && <p role="alert">{monthDiaries.error}</p>}
        <table className="calendar-table" aria-labelledby="calendar-month">
          <thead>
            <tr>
              {weekdays.map((weekday, index) => (
                <th key={weekday} scope="col" aria-label={weekdayNames[index]}>{weekday}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: weekCount }, (_, week) => (
              <tr key={week}>
                {weekdays.map((weekday, column) => {
                  const day = week * 7 + column - leadingDays + 1
                  if (day < 1 || day > daysInMonth) {
                    return <td key={weekday} className="calendar-empty" />
                  }

                  const date = dateKey(new Date(year, month.getMonth(), day))
                  const dayTasks = monthTasks?.entries.filter(task => task.task_date === date) ?? []
                  const dayDiaries = monthDiaries?.entries.filter(entry => entry.entry_date === date) ?? []
                  const dayHolidays = holidays?.year === year ? holidays.dates.get(date) : undefined

                  return (
                    <td key={weekday} className={dayHolidays ? 'calendar-holiday' : undefined}>
                      <a className="calendar-day-link" href={'/tasks?date=' + date} aria-label={date + ' 할 일'}>
                        <time dateTime={date}>{day}</time>
                      </a>
                      {dayHolidays?.map(name => <p className="calendar-holiday-name" key={name}>{name}</p>)}
                      {(dayTasks.length > 0 || dayDiaries.length > 0) && (
                        <ul className="calendar-entries">
                          {dayTasks.map(task => (
                            <li key={task.id} className="calendar-entry calendar-entry--task">
                              <a href={'/tasks?date=' + date}>
                                <span className="calendar-entry-type">{task.completed ? '완료' : '할 일'}</span>
                                {task.completed ? <s>{task.title}</s> : task.title}
                              </a>
                            </li>
                          ))}
                          {dayDiaries.map(entry => (
                            <li key={entry.id} className="calendar-entry calendar-entry--diary">
                              <a href={'/diary/' + entry.id}>
                                <span className="calendar-entry-type">일기</span>
                                {entry.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  )
}
