// =============================================================
// Client de l'API Pousse (sauvegarde en ligne)
//
// Le mode en ligne s'active en définissant VITE_API_URL au moment du build
// (ex. VITE_API_URL=/api). Sans cette variable, l'application reste 100 %
// locale, exactement comme avant.
// =============================================================
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export const isRemoteMode = () => API_URL !== ''

export class ApiError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code }
}

// Appel JSON avec le cookie de session (httpOnly, jamais lisible en JavaScript)
export async function api(method, path, body) {
  let res
  try {
    // VITE_API_URL désigne la racine de l'API (ex. « /api » ou « https://exemple.fr/api ») ;
    // les chemins du code s'écrivent « /api/... » : on ne double pas le préfixe.
    const url = API_URL + (path.startsWith('/api/') ? path.slice(4) : path)
    res = await fetch(url, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'X-Pousse-Client': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'Pas de connexion au serveur')
  }
  let data = null
  try { data = await res.json() } catch { /* réponse vide */ }
  if (!res.ok) throw new ApiError(res.status, data?.error || 'Erreur du serveur', data?.code)
  return data
}
