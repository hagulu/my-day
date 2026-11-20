import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './Diary.css'
import { DiaryPlaceMap, DiaryPlaceSearch } from './DiaryLocation'

import { deleteEntry, diaryDate, moods, readEntries, readEntry, saveEntry } from './diaryData'
import type { DiaryLocation } from './kakaoMap'
import type { Entry } from './diaryData'
import { getDiaryWeather } from './weather'

const listUrl = '/diary'

export default function Diary({ path }: { path: string }) {
  const isNew = path === '/diary/new'
  const isList = path === listUrl
  const id = path.slice(listUrl.length + 1).replace(/\/edit$/, '')
  const [entries, setEntries] = useState<Entry[]>()
  const [entry, setEntry] = useState<Entry | null>()
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (isNew) return
    const controller = new AbortController()
    const load = isList
      ? readEntries(controller.signal).then((result) => {
        if (!controller.signal.aborted) setEntries(result)
      })
      : readEntry(id, controller.signal).then((result) => {
        if (!controller.signal.aborted) setEntry(result)
      })
    void load.catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : '일기를 불러오지 못했어요.')
      }
    })
    return () => controller.abort()
  }, [id, isList, isNew])

  async function remove() {
    if (!entry || deleting || !window.confirm('이 일기를 삭제할까요?')) return
    setDeleting(true)
    setError('')
    try {
      await deleteEntry(entry.id)
      window.location.assign(listUrl)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '일기를 삭제하지 못했어요.')
      setDeleting(false)
    }
  }

  if (path === listUrl) {
    return (
      <main className="journal">
        <div className="journal-heading">
          <h1>일기 목록</h1>
          <a className="journal-button primary" href="/diary/new">＋ 일기 작성</a>
        </div>
        <div className="journal-list">
          {error && <p role="alert">{error}</p>}
          {!error && !entries && <p role="status">일기를 불러오는 중이에요.</p>}
          {entries?.length === 0 && <p>아직 작성한 일기가 없어요.</p>}
          {entries?.map((item) => (
            <article className="card journal-entry" key={item.id}>
              <h2>{item.title}</h2>
              <time dateTime={item.date}>{diaryDate(item.date)}</time>
              <p className="journal-preview">{item.content}</p>
              <a className="journal-button" href={listUrl + '/' + item.id} aria-label={item.title + ' 상세 보기'}>상세 보기 <span aria-hidden="true">→</span></a>
            </article>
          ))}
        </div>
      </main>
    )
  }

  const isEdit = path.endsWith('/edit')
  if (isNew || (entry && isEdit)) return <DiaryForm entry={entry ?? undefined} />

  if (!entry) {
    return (
      <main className="journal journal-narrow">
        <h1>{isEdit ? '일기 수정' : '일기 상세'}</h1>
        <p role={error ? 'alert' : 'status'}>
          {error || (entry === undefined ? '일기를 불러오는 중이에요.' : '일기를 찾을 수 없어요.')}
        </p>
        <a className="journal-button" href={listUrl}>목록으로</a>
      </main>
    )
  }

  return (
    <main className="journal journal-narrow">
      <div className="journal-heading">
        <h1>일기 상세</h1>
        <a className="journal-button" href={listUrl}>목록으로</a>
      </div>
      <article className="card journal-panel">
        <h2>{entry.title}</h2>
        <time dateTime={entry.date}>{diaryDate(entry.date)}</time>
        <dl className="journal-metadata">
          <div><dt>날씨</dt><dd>{entry.weather || '기록 없음'}</dd></div>
          <div><dt>기분</dt><dd>{entry.mood} {moods.find(([emoji]) => emoji === entry.mood)?.[1] || '기록 없음'}</dd></div>
        </dl>
        <p className="journal-content">{entry.content}</p>
        <h3>장소</h3>
        {entry.location
          ? <DiaryPlaceMap location={entry.location} />
          : <p className="journal-place">{entry.place || '기록 없음'}</p>}
        {error && <p role="alert">{error}</p>}
        <div className="journal-actions">
          <a className="journal-button primary" href={listUrl + '/' + entry.id + '/edit'}>일기 수정</a>
          <button className="journal-button" type="button" onClick={remove} disabled={deleting}>
            {deleting ? '삭제 중…' : '일기 삭제'}
          </button>
        </div>
      </article>
    </main>
  )
}

function DiaryForm({ entry }: { entry?: Entry }) {
  const [location, setLocation] = useState<DiaryLocation | undefined>(entry?.location)
  const [saving, setSaving] = useState(false)
  const [weather, setWeather] = useState(entry?.weather ?? '')
  const [error, setError] = useState('')
  const detailUrl = entry ? listUrl + '/' + entry.id : listUrl
  const [localDate] = useState(() => {
    const today = new Date()
    return new Date(today.getTime() - today.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)
  })

  const [date, setDate] = useState(entry?.date ?? localDate)
  const [weatherStatus, setWeatherStatus] = useState('')
  const [loadingWeather, setLoadingWeather] = useState(false)
  const request = useRef<AbortController | null>(null)
  const fetchedWeather = useRef(false)

  useEffect(() => () => request.current?.abort(), [])

  function resetWeatherRequest() {
    request.current?.abort()
    setLoadingWeather(false)
    setWeatherStatus('')
  }

  async function loadWeather() {
    if (!date) {
      setWeatherStatus('날짜를 먼저 선택해 주세요.')
      return
    }

    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setLoadingWeather(true)
    setWeatherStatus('현재 위치의 날씨를 불러오는 중이에요.')

    try {
      const result = await getDiaryWeather(date, controller.signal)
      if (controller.signal.aborted) return
      setWeather(result)
      fetchedWeather.current = true
      setWeatherStatus('선택한 날짜의 날씨를 입력했어요.')
    } catch (error) {
      if (!controller.signal.aborted) {
        setWeatherStatus(error instanceof Error && error.name === 'Error'
          ? error.message
          : '날씨를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
      }
    } finally {
      if (!controller.signal.aborted) setLoadingWeather(false)
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || loadingWeather) return
    setError('')
    const fields = new FormData(event.currentTarget)
    const value = (name: string) => String(fields.get(name) ?? '').trim()
    const updated = {
      title: value('title'), date: value('date'), content: value('content'),
      weather: value('weather'), mood: value('mood'), place: value('place'), location,
    }

    if (!updated.title || !updated.content) {
      setError('제목과 내용을 입력해 주세요.')
      return
    }

    setSaving(true)
    try {
      const id = await saveEntry(updated, entry?.id)
      window.location.assign(listUrl + '/' + id)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '일기를 저장하지 못했어요.')
      setSaving(false)
    }
  }

  return (
    <main className="journal journal-narrow">
      <h1>{entry ? '일기 수정' : '일기 작성'}</h1>
      <form className="card journal-panel journal-form" onSubmit={save}>
        <label>제목<input name="title" defaultValue={entry?.title} placeholder="제목을 입력하세요" required /></label>
        <label>날짜<input name="date" type="date" value={date} onChange={(event) => {
          resetWeatherRequest()
          setDate(event.target.value)
          if (fetchedWeather.current) {
            setWeather('')
            fetchedWeather.current = false
          }
        }} required /></label>
        <label>내용<textarea name="content" defaultValue={entry?.content} placeholder="오늘의 이야기를 남겨보세요" rows={6} required /></label>
        <div className="journal-weather">
          <label>날씨<input name="weather" value={weather} onChange={(event) => {
            resetWeatherRequest()
            fetchedWeather.current = false
            setWeather(event.target.value)
          }} placeholder="예: 맑음" /></label>
          <button className="journal-button" type="button" onClick={loadWeather} disabled={loadingWeather}>{loadingWeather ? '불러오는 중…' : '날씨 불러오기'}</button>
        </div>
        <p className="journal-weather-status" role="status">{weatherStatus}</p>
        <fieldset className="journal-moods">
          <legend>기분</legend>
          <div>
            {moods.map(([emoji, label]) => (
              <label key={emoji} title={label}>
                <input type="radio" name="mood" value={emoji} defaultChecked={entry?.mood === emoji} aria-label={label} />
                <span aria-hidden="true">{emoji}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {entry && <label>장소<input name="place" defaultValue={entry.place} placeholder="장소를 입력하세요" /></label>}
        <DiaryPlaceSearch selected={location} onSelect={setLocation} />
        {error && <p role="alert">{error}</p>}
        <div className="journal-actions">
          <a className="journal-button" href={detailUrl}>취소</a>
          <button className="journal-button primary" type="submit" disabled={loadingWeather || saving}>{saving ? '저장 중…' : '저장'}</button>
        </div>
      </form>
    </main>
  )
}

