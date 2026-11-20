export type DiaryLocation = {
  name: string
  address: string
  latitude: number
  longitude: number
}

type KakaoPlace = {
  id: string
  place_name: string
  road_address_name: string
  address_name: string
  x: string
  y: string
}

type Coordinates = object
type KakaoMap = object

type KakaoMaps = {
  load: (ready: () => void) => void
  LatLng: new (latitude: number, longitude: number) => Coordinates
  Map: new (container: HTMLElement, options: { center: Coordinates; level: number }) => KakaoMap
  Marker: new (options: { map: KakaoMap; position: Coordinates }) => { setMap: (map: KakaoMap | null) => void }
  services: {
    Places: new () => {
      keywordSearch: (keyword: string, callback: (places: KakaoPlace[], status: string) => void) => void
    }
    Status: { OK: string; ZERO_RESULT: string }
  }
}

const sdkWindow = window as Window & { kakao?: { maps?: KakaoMaps } }
let sdkPromise: Promise<KakaoMaps> | undefined

export function loadKakaoMaps() {
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<KakaoMaps>((resolve, reject) => {
    const existingMaps = sdkWindow.kakao?.maps
    const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim()
    if (!existingMaps && !key) {
      reject(new Error('카카오맵 JavaScript 키가 설정되지 않았어요.'))
      return
    }

    const script = existingMaps ? null : document.createElement('script')
    function fail() {
      clearTimeout(timeout)
      script?.remove()
      reject(new Error('카카오맵을 불러오지 못했어요.'))
    }
    const timeout = window.setTimeout(fail, 12000)

    function ready() {
      const maps = sdkWindow.kakao?.maps
      if (!maps?.load) {
        fail()
        return
      }
      maps.load(() => {
        if (!maps.services?.Places || !maps.Map) {
          fail()
          return
        }
        clearTimeout(timeout)
        resolve(maps)
      })
    }

    if (script) {
      script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&libraries=services&autoload=false`
      script.onload = ready
      script.onerror = fail
      document.head.append(script)
    } else {
      ready()
    }
  }).catch((error: unknown) => {
    sdkPromise = undefined
    throw error
  })

  return sdkPromise
}

export async function searchDiaryPlaces(keyword: string) {
  const { services } = await loadKakaoMaps()

  return new Promise<{ id: string; location: DiaryLocation }[]>((resolve, reject) => {
    new services.Places().keywordSearch(keyword, (places, status) => {
      if (status === services.Status.OK) {
        resolve(places.map((place) => ({
          id: place.id,
          location: {
            name: place.place_name,
            address: place.road_address_name || place.address_name,
            latitude: Number(place.y),
            longitude: Number(place.x),
          },
        })))
      } else if (status === services.Status.ZERO_RESULT) {
        resolve([])
      } else {
        reject(new Error('장소를 검색하지 못했어요. 다시 시도해 주세요.'))
      }
    })
  })
}
