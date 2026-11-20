import { useEffect, useState } from 'react'
import { getKoreanHolidays } from './koreanHolidays'
import './Calendar.css'

const weekdays = ['일', '월', '화', '수', '목', '금', '토']
const weekdayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']

type Entry = { day: number; kind: 'task' | 'diary'; title: string }

const entries: Entry[] = [
  { day: 3, kind: 'task', title: '이번 달 계획 세우기' },
  { day: 7, kind: 'diary', title: '느긋한 오후' },
  { day: 12, kind: 'task', title: '도서관 책 반납하기' },
  { day: 18, kind: 'task', title: '친구와 카페 가기' },
  { day: 18, kind: 'diary', title: '오늘도 좋은 하루' },
  { day: 23, kind: 'task', title: '저녁 산책하기' },
  { day: 26, kind: 'diary', title: '기억하고 싶은 순간' },
]

function firstOfMonth(date: Date, offset = 0) {
  return new Date(date.getFullYear(), date.getMonth() + offset, 1)
}

export default function Calendar() {
  const [sampleMonth] = useState(() => firstOfMonth(new Date()))
  const [month, setMonth] = useState(sampleMonth)
  const year = month.getFullYear()
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
  const monthNumber = month.getMonth() + 1
  const leadingDays = month.getDay()
  const daysInMonth = new Date(year, monthNumber, 0).getDate()
  const weekCount = Math.ceil((leadingDays + daysInMonth) / 7)
  const monthEntries = month.getTime() === sampleMonth.getTime() ? entries : []
  const monthIso = String(monthNumber).padStart(2, '0')

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

                  const dayEntries = monthEntries.filter(entry => entry.day === day)
                  const date = year + '-' + monthIso + '-' + String(day).padStart(2, '0')
                  const dayHolidays = holidays?.year === year ? holidays.dates.get(date) : undefined

                  return (
                    <td key={weekday} className={dayHolidays ? 'calendar-holiday' : undefined}>
                      <time dateTime={date}>{day}</time>
                      {dayHolidays?.map(name => <p className="calendar-holiday-name" key={name}>{name}</p>)}
                      {dayEntries.length > 0 && (
                        <ul className="calendar-entries">
                          {dayEntries.map(entry => (
                            <li key={entry.title} className={'calendar-entry calendar-entry--' + entry.kind}>
                              <span className="calendar-entry-type">{entry.kind === 'task' ? '할 일' : '일기'}</span>
                              <span>{entry.title}</span>
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
