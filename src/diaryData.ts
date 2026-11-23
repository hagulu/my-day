import { createClient } from '@supabase/supabase-js'
import type { DiaryLocation } from './kakaoMap'

export type Entry = {
  id: string
  title: string
  date: string
  content: string
  weather: string
  mood: string
  place: string
  location?: DiaryLocation
}

type DiaryRow = {
  id: string
  title: string
  content: string
  entry_date: string
  weather: string | null
  mood: string | null
  place: string | null
  place_name: string | null
  place_address: string | null
  latitude: number | null
  longitude: number | null
}

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const client = url && key ? createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
}) : null

function diaryTable() {
  if (!client) throw new Error('Supabase 연결 설정이 필요해요.')
  return client.from('diary_entries')
}

function toEntry(row: DiaryRow): Entry {
  const { place_name, place_address, latitude, longitude } = row
  const hasLocation = place_name !== null && place_address !== null && latitude !== null && longitude !== null

  return {
    id: row.id,
    title: row.title,
    date: row.entry_date,
    content: row.content,
    weather: row.weather ?? '',
    mood: row.mood ?? '',
    place: row.place ?? '',
    location: hasLocation ? { name: place_name, address: place_address, latitude, longitude } : undefined,
  }
}

function checkError(error: { code: string } | null, message: string) {
  if (error?.code === '42501') throw new Error('현재 데이터베이스 권한으로는 일기에 접근할 수 없어요.')
  if (error) throw new Error(message)
}

export async function readEntries(signal: AbortSignal, limit?: number) {
  let query = diaryTable().select('*').order('entry_date', { ascending: false }).order('id')
  if (limit !== undefined) query = query.limit(limit)
  const { data, error } = await query.abortSignal(signal)
  checkError(error, '일기 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  return (data ?? []).map(toEntry)
}

export async function readDiaryDates(start: string, end: string, signal: AbortSignal) {
  const { data, error } = await diaryTable().select('id,title,entry_date')
    .gte('entry_date', start).lt('entry_date', end).order('entry_date').order('id').abortSignal(signal)
  checkError(error, '캘린더의 일기를 불러오지 못했어요.')
  return data ?? []
}

export async function readEntry(id: string, signal: AbortSignal) {
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)) return null
  const { data, error } = await diaryTable().select('*').eq('id', id).abortSignal(signal).maybeSingle()
  checkError(error, '일기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
  return data ? toEntry(data) : null
}

export async function saveEntry(entry: Omit<Entry, 'id'>, id?: string) {
  const row: Omit<DiaryRow, 'id'> = {
    title: entry.title,
    content: entry.content,
    entry_date: entry.date,
    weather: entry.weather || null,
    mood: entry.mood || null,
    place: entry.place || null,
    place_name: entry.location?.name ?? null,
    place_address: entry.location?.address ?? null,
    latitude: entry.location?.latitude ?? null,
    longitude: entry.location?.longitude ?? null,
  }
  const table = diaryTable()
  const query = id ? table.update(row).eq('id', id) : table.insert(row)
  const { data, error } = await query.select('id').maybeSingle()
  checkError(error, '일기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  if (!data) throw new Error('저장할 일기를 찾을 수 없거나 수정 권한이 없어요.')
  return data.id as string
}

export async function deleteEntry(id: string) {
  const { data, error } = await diaryTable().delete().eq('id', id).select('id').maybeSingle()
  checkError(error, '일기를 삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')
  if (!data) throw new Error('삭제할 일기를 찾을 수 없거나 삭제 권한이 없어요.')
}

export const moods = [
  ['😄', '아주 좋음'], ['🙂', '좋음'], ['😐', '보통'], ['😢', '슬픔'], ['😠', '화남'],
]

export function diaryDate(date: string, format?: 'home') {
  const options: Intl.DateTimeFormatOptions = format === 'home'
    ? { month: 'long', day: 'numeric', weekday: 'short' }
    : { dateStyle: 'full' }
  return new Intl.DateTimeFormat('ko-KR', options).format(new Date(date + 'T00:00:00'))
}
