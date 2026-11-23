import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { addTask, dateKey, deleteTask, readTasks, updateTask } from './taskData'
import type { Task } from './taskData'
import './Tasks.css'

const emptyDraft = (date: string) => ({ title: '', task_date: date })

export default function Tasks() {
  const [date, setDate] = useState(() => {
    const selected = new URLSearchParams(window.location.search).get('date') ?? ''
    const parsed = new Date(selected + 'T00:00:00')
    return Number.isNaN(parsed.getTime()) || dateKey(parsed) !== selected ? '' : selected
  })
  const [draft, setDraft] = useState(() => emptyDraft(date || dateKey(new Date())))
  const [tasks, setTasks] = useState<Task[]>()
  const [editingId, setEditingId] = useState('')
  const [loadingError, setLoadingError] = useState('')
  const [actionError, setActionError] = useState('')
  const [reload, setReload] = useState(0)
  const [busy, setBusy] = useState(false)
  const pending = useRef(false)
  const draftId = useRef('')
  const titleInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    void readTasks(controller.signal).then(result => {
      if (!controller.signal.aborted) setTasks(result)
    }).catch((error: Error) => {
      if (!controller.signal.aborted) setLoadingError(error.message)
    })
    return () => controller.abort()
  }, [reload])

  async function mutate(action: () => Promise<void>) {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setActionError('')
    try {
      await action()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '잠시 후 다시 시도해 주세요.')
    } finally {
      pending.current = false
      setBusy(false)
    }
  }

  function resetDraft(nextDate = date) {
    setEditingId('')
    draftId.current = ''
    setDraft(emptyDraft(nextDate || dateKey(new Date())))
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const title = draft.title.trim()
    if (!title) {
      setActionError('할 일 이름을 입력해 주세요.')
      titleInput.current?.focus()
      return
    }
    void mutate(async () => {
      const fields = { title, task_date: draft.task_date }
      const saved = editingId
        ? await updateTask(editingId, fields)
        : await addTask({ ...fields, id: draftId.current ||= crypto.randomUUID() })
      setTasks(previous => [...(previous ?? []).filter(task => task.id !== saved.id), saved])
      const nextDate = date ? saved.task_date : ''
      setDate(nextDate)
      resetDraft(nextDate)
    })
  }

  const visible = tasks?.filter(task => !date || task.task_date === date)
    .sort((first, second) => first.task_date.localeCompare(second.task_date) || first.title.localeCompare(second.title, 'ko'))
  const disabled = busy || !tasks

  return (
    <main className="journal journal-narrow task-page">
      <h1>할 일</h1>
      <section className="card" aria-labelledby="task-form-heading">
        <h2 id="task-form-heading">{editingId ? '할 일 수정' : '할 일 추가'}</h2>
        <form className="journal-form task-form" onSubmit={save}>
          <label>할 일 이름
            <input ref={titleInput} required maxLength={120} value={draft.title} disabled={disabled}
              onChange={event => {
                draftId.current = ''
                setDraft({ ...draft, title: event.target.value })
              }} />
          </label>
          <label>날짜
            <input type="date" required min="0001-01-01" max="9999-12-31" value={draft.task_date} disabled={disabled}
              onChange={event => {
                draftId.current = ''
                setDraft({ ...draft, task_date: event.target.value })
              }} />
          </label>
          <div className="task-actions">
            {editingId && <button className="journal-button" type="button" disabled={busy} onClick={() => {
              resetDraft()
              setActionError('')
            }}>취소</button>}
            <button className="journal-button primary" disabled={disabled}>{editingId ? '저장' : '추가'}</button>
          </div>
        </form>
        {actionError && <p className="task-error" role="alert">{actionError}</p>}
      </section>

      <section className="card" aria-labelledby="task-list-heading">
        <div className="task-toolbar">
          <h2 id="task-list-heading">할 일 목록</h2>
          <label>날짜 필터
            <input type="date" value={date} disabled={busy} onChange={event => {
              const selected = event.target.value
              setDate(selected)
              if (!editingId) setDraft(previous => ({ ...previous, task_date: selected || dateKey(new Date()) }))
              draftId.current = ''
            }} />
          </label>
          {date && <button className="journal-button" type="button" disabled={busy} onClick={() => setDate('')}>전체 보기</button>}
        </div>
        {loadingError && <div className="task-toolbar">
          <p className="task-error" role="alert">{loadingError}</p>
          <button className="journal-button" type="button" onClick={() => {
            setLoadingError('')
            setReload(previous => previous + 1)
          }}>다시 시도</button>
        </div>}
        {!tasks && !loadingError && <p role="status">할 일을 불러오는 중이에요.</p>}
        {visible?.length === 0 && <p>표시할 할 일이 없어요.</p>}
        {visible && visible.length > 0 && <ul className="task-list">
          {visible.map(task => (
            <li key={task.id} className="task-row">
              <label className="task-check">
                <input type="checkbox" checked={task.completed} disabled={busy} onChange={event => {
                  const completed = event.target.checked
                  void mutate(async () => {
                    const saved = await updateTask(task.id, { completed })
                    setTasks(previous => previous?.map(item => item.id === saved.id ? saved : item))
                  })
                }} />
                <span>{task.title}</span>
              </label>
              <time dateTime={task.task_date}>{task.task_date}</time>
              <div className="task-actions">
                <button className="journal-button" type="button" disabled={busy} onClick={() => {
                  setEditingId(task.id)
                  setDraft({ title: task.title, task_date: task.task_date })
                  draftId.current = ''
                  setActionError('')
                  titleInput.current?.focus()
                }}>수정</button>
                <button className="journal-button" type="button" disabled={busy} onClick={() => {
                  if (!window.confirm('이 할 일을 삭제할까요?')) return
                  void mutate(async () => {
                    await deleteTask(task.id)
                    setTasks(previous => previous?.filter(item => item.id !== task.id))
                    if (editingId === task.id) resetDraft()
                  })
                }}>삭제</button>
              </div>
            </li>
          ))}
        </ul>}
      </section>
    </main>
  )
}
