// =============================================================
// Météo — Open-Météo API (gratuit, sans clé API)
// Utilise la géolocalisation du navigateur pour récupérer la
// météo actuelle. Cache le résultat en localStorage 30 min.
// =============================================================

const CACHE_KEY = 'pousse.weather.v2'
const CACHE_TTL = 15 * 60 * 1000 // 15 minutes

/**
 * WMO Weather interpretation codes → catégorie simplifiée
 * https://open-meteo.com/en/docs
 * 0 = clear sky, 1 = mainly clear, 2 = partly cloudy, 3 = overcast
 */
function classifyWeather(code) {
  if (code <= 1) return 'clear'       // ciel degagé ou essentiellement degagé
  if (code === 2) return 'clear'      // partiellement nuageux → soleil avec quelques nuages
  if (code === 3) return 'cloudy'     // couvert
  if (code <= 48) return 'fog'        // brouillard (45, 48)
  if (code <= 57) return 'drizzle'    // bruine (51-57)
  if (code <= 67) return 'rain'       // pluie (61-67)
  if (code <= 77) return 'snow'       // neige (71-77)
  if (code <= 82) return 'rain'       // averses (80-82)
  if (code <= 86) return 'snow'       // averses de neige (85-86)
  if (code >= 95) return 'storm'      // orage (95-99)
  return 'cloudy'
}

function getCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (Date.now() - data.ts > CACHE_TTL) return null
    return data.weather
  } catch {
    return null
  }
}

function setCache(weather) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), weather }))
  } catch { /* ignore */ }
}

/**
 * Récupère la météo actuelle via géolocalisation + Open-Météo.
 * Renvoie une promesse : { type, isDay, temp } ou null en cas d'erreur.
 * type : 'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'storm'
 */
export async function fetchWeather() {
  const cached = getCache()
  if (cached) return cached

  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('no geolocation'))
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: CACHE_TTL,
      })
    })

    const { latitude, longitude } = pos.coords
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    const cw = data.current_weather

    const weather = {
      type: classifyWeather(cw.weathercode),
      isDay: cw.is_day === 1,
      temp: cw.temperature,
    }
    setCache(weather)
    return weather
  } catch {
    return null
  }
}
