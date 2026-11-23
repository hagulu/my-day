import { createClient } from '@supabase/supabase-js'

export type Task = {
  id: string
  title: string
  task_date: string
  completed: boolean
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null
const columns = 'id,title,task_date,completed'

function taskTable() {
  if (!client) throw new Error('Supabase 연결 설정이 필요해요.')
  return client.from('tasks')
}

export function dateKey(date: Date) {
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export async function readTasks(signal: AbortSignal, start?: string, end?: string) {
  const tasks: Task[] = []

  const pageSize = 100
  while (!signal.aborted) {
    let query = taskTable().select(columns, { count: 'exact' })
      .order('task_date').order('id')
    if (start) query = query.gte('task_date', start)
    if (end) query = query.lt('task_date', end)
    const { data, error, count } = await query
      .range(tasks.length, tasks.length + pageSize - 1).abortSignal(signal)
    if (error) throw new Error('할 일을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    tasks.push(...data)
    if (!data.length || (count !== null && tasks.length >= count)) break
  }
  return tasks
}

export async function addTask(task: Pick<Task, 'id' | 'title' | 'task_date'>) {
  const table = taskTable()
  const { data, error } = await table.insert(task).select(columns).single()
  if (error?.code === '23505') {
    const saved = await table.select(columns).eq('id', task.id).single()
    if (saved.data) return saved.data
  }
  if (!data) throw new Error('할 일을 추가하지 못했어요. 잠시 후 다시 시도해 주세요.')
  return data
}

export async function updateTask(id: string, changes: Partial<Omit<Task, 'id'>>) {
  const { data } = await taskTable().update(changes).eq('id', id).select(columns).single()
  if (!data) throw new Error('할 일을 수정하지 못했어요. 잠시 후 다시 시도해 주세요.')
  return data
}

export async function deleteTask(id: string) {
  const { error } = await taskTable().delete().eq('id', id)
  if (error) throw new Error('할 일을 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')
}
