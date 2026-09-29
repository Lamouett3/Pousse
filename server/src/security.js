import { scrypt, randomBytes, timingSafeEqual, createHash } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
// Paramètres scrypt (≈ 64 Mo de mémoire par hachage, recommandation OWASP)
const N = 2 ** 16, r = 8, p = 1, KEYLEN = 64
const MAXMEM = 128 * N * r * 2

export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEYLEN, { N, r, p, maxmem: MAXMEM })
  return `scrypt$${N}$${r}$${p}$${salt.toString('base64')}$${hash.toString('base64')}`
}

export async function verifyPassword(password, stored) {
  const [algo, n, rr, pp, saltB64, hashB64] = String(stored).split('$')
  if (algo !== 'scrypt') return false
  const expected = Buffer.from(hashB64, 'base64')
  const actual = await scryptAsync(password, Buffer.from(saltB64, 'base64'), expected.length,
    { N: Number(n), r: Number(rr), p: Number(pp), maxmem: 128 * Number(n) * Number(rr) * 2 })
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

// Empreinte factice : on hache quand même si le compte n'existe pas,
// pour que le temps de réponse ne révèle pas quels noms sont inscrits.
let dummyHash = null
export async function dummyVerify(password) {
  if (!dummyHash) dummyHash = await hashPassword('pousse-dummy-password')
  await verifyPassword(password, dummyHash)
  return false
}

export const newSessionToken = () => randomBytes(32).toString('base64url')
export const hashToken = (token) => createHash('sha256').update(token).digest('hex')
export const nameKey = (name) => name.trim().toLowerCase()
