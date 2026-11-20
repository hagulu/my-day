const weatherGroups = [
  { codes: [0, 1], label: '맑음', icon: '☀', color: 'sun' },
  { codes: [2], label: '구름 조금', icon: '🌤', color: 'cloudy' },
  { codes: [3], label: '흐림', icon: '☁', color: 'cloudy' },
  { codes: [45, 48], label: '안개', icon: '≋', color: 'cloudy' },
  { codes: [51, 53, 55, 56, 57, 61, 63, 65, 66, 67], label: '비', icon: '☔', color: 'rain' },
  { codes: [71, 73, 75, 77, 85, 86], label: '눈', icon: '❄', color: 'rain' },
  { codes: [80, 81, 82], label: '소나기', icon: '☔', color: 'rain' },
  { codes: [95, 96, 97, 99], label: '뇌우', icon: 'ϟ', color: 'rain' },
]


export function getWeatherCondition(code: number) {
  return weatherGroups.find(group => group.codes.includes(code))
}

export async function getDiaryWeather(date: string, signal: AbortSignal) {
  if (!navigator.geolocation) throw new Error('이 브라우저에서 현재 위치를 확인할 수 없어요.')

  const { latitude, longitude } = await new Promise<GeolocationCoordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve(coords),
      (error) => reject(new Error(error.code === 1
        ? '브라우저에서 위치 접근을 허용해 주세요.'
        : '현재 위치를 확인하지 못했어요. 다시 시도해 주세요.')),
      { timeout: 7000, maximumAge: 300_000 },
    )
  })
  signal.throwIfAborted()

  const ageInDays = (Date.now() - Date.parse(date)) / 86_400_000
  if (ageInDays < -16 || date < '1940-01-01') {
    throw new Error('조회할 수 있는 날짜 범위를 벗어났어요.')
  }
  const endpoint = ageInDays > 60
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast'
  const query = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    start_date: date,
    end_date: date,
    timezone: 'auto',
    daily: 'weather_code',
  })

  const response = await fetch(endpoint + '?' + query, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)]),
  })
  if (response.status === 400) throw new Error('선택한 날짜의 날씨 자료를 조회할 수 없어요.')
  if (!response.ok) throw new Error('날씨를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')

  const { daily } = await response.json()
  const index = daily?.time?.indexOf(date) ?? -1
  const code = daily?.weather_code?.[index]
  if (index < 0 || !Number.isInteger(code)) {
    throw new Error('선택한 날짜의 날씨 자료가 없어요.')
  }

  const condition = getWeatherCondition(code)
  return [condition?.icon, condition?.label ?? '상태 미상'].filter(Boolean).join(' ')
}

