import { useEffect, useState } from 'react'
import { getWeatherCondition } from './weather'

const anyang = { latitude: 37.3943, longitude: 126.9568, label: '안양시' }

type WeatherState =
  | { status: 'loading' | 'error' }
  | { status: 'ready'; location: string; code: number; temperature: number }

function getWeatherLocation() {
  return new Promise<typeof anyang>(resolve => {
    if (!navigator.geolocation) {
      resolve(anyang)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({
        latitude: coords.latitude,
        longitude: coords.longitude,
        label: '현재 위치',
      }),
      () => resolve(anyang),
      { timeout: 7000, maximumAge: 300_000 },
    )
  })
}

export default function WeatherCard() {
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' })
  const today = new Date()
  const dateLabel = new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(today)
  const dateTime = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-')

  useEffect(() => {
    const controller = new AbortController()

    async function loadWeather() {
      try {
        const location = await getWeatherLocation()
        if (controller.signal.aborted) return

        const query = new URLSearchParams({
          latitude: String(location.latitude),
          longitude: String(location.longitude),
          current: 'temperature_2m,weather_code',
          temperature_unit: 'celsius',
          forecast_days: '1',
        })
        const response = await fetch('https://api.open-meteo.com/v1/forecast?' + query, {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]),
        })
        if (!response.ok) throw new Error('Weather request failed')

        const data = await response.json()
        const temperature = data.current?.temperature_2m
        const code = data.current?.weather_code
        if (!Number.isFinite(temperature) || !Number.isInteger(code)) {
          throw new Error('Weather response is incomplete')
        }

        if (!controller.signal.aborted) {
          setWeather({ status: 'ready', location: location.label, code, temperature })
        }
      } catch {
        if (!controller.signal.aborted) setWeather({ status: 'error' })
      }
    }

    void loadWeather()
    return () => controller.abort()
  }, [])

  const condition = weather.status === 'ready'
    ? getWeatherCondition(weather.code)
    : undefined

  return (
    <section className="card weather" aria-labelledby="weather-heading">
      <div className="cloud" aria-hidden="true" />
      <h2 id="weather-heading">오늘의 날씨</h2>
      <time dateTime={dateTime}>{dateLabel}</time>
      <div role="status">
        {weather.status === 'ready' ? (
          <div className="conditions">
            <span><i className="pin" aria-hidden="true" />{weather.location}</span>
            <span>
              <i className={'weather-icon ' + (condition?.color ?? 'cloudy')} aria-hidden="true">
                {condition?.icon ?? '—'}
              </i>
              {condition?.label ?? '상태 미상'}
            </span>
            <span>{weather.temperature}°C</span>
          </div>
        ) : (
          <p className="weather-message">
            {weather.status === 'loading'
              ? '날씨를 불러오는 중이에요.'
              : '날씨를 불러오지 못했어요. 잠시 후 다시 확인해 주세요.'}
          </p>
        )}
      </div>
    </section>
  )
}
