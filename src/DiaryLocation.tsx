import { useEffect, useRef, useState } from 'react'
import { loadKakaoMaps, searchDiaryPlaces } from './kakaoMap'
import type { DiaryLocation } from './kakaoMap'

export function DiaryPlaceMap({ location }: { location: DiaryLocation }) {
  const container = useRef<HTMLDivElement>(null)
  const [failedLocation, setFailedLocation] = useState<DiaryLocation>()
  const { name, address, latitude, longitude } = location

  useEffect(() => {
    const element = container.current
    if (!element) return

    let active = true
    let marker: { setMap: (map: null) => void } | undefined
    loadKakaoMaps().then((maps) => {
      if (!active) return
      const position = new maps.LatLng(latitude, longitude)
      const map = new maps.Map(element, { center: position, level: 4 })
      marker = new maps.Marker({ map, position })
      setFailedLocation(undefined)
    }).catch(() => {
      if (active) setFailedLocation(location)
    })

    return () => {
      active = false
      marker?.setMap(null)
      element.replaceChildren()
    }
  }, [latitude, longitude, location])

  return (
    <div>
      <p className="journal-place"><strong>{name}</strong><br />{address}</p>
      <div className="journal-map-frame">
        <div className="journal-map" ref={container} role="region" aria-label={name + ' 지도'} hidden={failedLocation === location} />
        <a
          className="journal-button journal-map-link"
          href={`https://map.kakao.com/link/map/${encodeURIComponent(name)},${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="카카오맵에서 보기 (새 탭)"
        >카카오맵에서 보기 ↗</a>
      </div>
      {failedLocation === location && <p role="status">카카오맵을 불러올 수 없어요.</p>}
    </div>
  )
}

export function DiaryPlaceSearch({ selected, onSelect }: {
  selected?: DiaryLocation
  onSelect: (location: DiaryLocation | undefined) => void
}) {
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchDiaryPlaces>>>([])
  const [status, setStatus] = useState('')
  const request = useRef(0)

  useEffect(() => () => { request.current += 1 }, [])

  async function search() {
    const query = keyword.trim()
    const id = ++request.current
    setResults([])
    if (!query) {
      setStatus('검색할 장소 이름을 입력해 주세요.')
      return
    }
    setStatus('장소를 검색하는 중이에요.')

    try {
      const places = await searchDiaryPlaces(query)
      if (id !== request.current) return
      setResults(places)
      setStatus(places.length ? `검색 결과 ${places.length}개` : '검색 결과가 없어요.')
    } catch (error) {
      if (id === request.current) {
        setStatus(error instanceof Error ? error.message : '장소를 검색하지 못했어요.')
      }
    }
  }

  return (
    <div className="journal-location">
      <div className="journal-location-search">
        <label>장소 검색<input type="search" value={keyword} placeholder="예: 서울숲" onChange={(event) => {
          request.current += 1
          setKeyword(event.target.value)
          setResults([])
          setStatus('')
        }} onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            void search()
          }
        }} /></label>
        <button className="journal-button" type="button" onClick={search}>검색</button>
      </div>
      <p className="journal-weather-status" role="status">{status}</p>
      {results.length > 0 && (
        <ul className="journal-location-results" aria-label="장소 검색 결과">
          {results.map(({ id, location }) => (
            <li key={id}>
              <button type="button" onClick={() => onSelect(location)} aria-pressed={selected === location}>
                <strong>{location.name}</strong>
                <span>{location.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div>
          <DiaryPlaceMap location={selected} />
          <button type="button" className="journal-button" onClick={() => onSelect(undefined)}>선택 장소 해제</button>
        </div>
      )}
    </div>
  )
}
