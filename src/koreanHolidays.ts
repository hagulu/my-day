type Holiday = {
  date: string
  localName: string
  name: string
  types: string[]
}

type HolidaysByDate = ReadonlyMap<string, readonly string[]>

const holidayRequests = new Map<number, Promise<HolidaysByDate>>()

export function getKoreanHolidays(year: number): Promise<HolidaysByDate> {
  const cached = holidayRequests.get(year)
  if (cached) return cached

  const request = fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/KR`, {
    signal: AbortSignal.timeout(10_000),
  })
    .then(async response => {
      if (!response.ok) throw new Error('Holiday request failed')

      const holidays: Holiday[] = await response.json()
      const byDate = new Map<string, string[]>()

      for (const holiday of holidays) {
        if (!holiday.types.includes('Public')) continue
        const name = holiday.localName || holiday.name
        const names = byDate.get(holiday.date) ?? []
        if (!names.includes(name)) names.push(name)
        byDate.set(holiday.date, names)
      }

      return byDate
    })
    .catch(error => {
      holidayRequests.delete(year)
      throw error
    })

  holidayRequests.set(year, request)
  return request
}
