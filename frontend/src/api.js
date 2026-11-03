// One place for talking to the FastAPI backend.
// Every page uses api(...), so the login token and error handling live only here.

const TOKEN_KEY = 'freshbasket_token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage blocked: the user stays logged in until the page reloads
  }
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // nothing to clear
  }
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// fastapi_users returns codes like "LOGIN_BAD_CREDENTIALS"; turn them into readable text
const FRIENDLY = {
  LOGIN_BAD_CREDENTIALS: 'Wrong email or password.',
  LOGIN_USER_NOT_VERIFIED: 'This account is not verified yet.',
  REGISTER_USER_ALREADY_EXISTS: 'An account with this email already exists.',
}

function errorMessage(data, status) {
  const detail = data && data.detail
  if (typeof detail === 'string') return FRIENDLY[detail] ?? detail
  if (detail && typeof detail === 'object' && detail.reason) return detail.reason
  if (Array.isArray(detail)) {
    // Pydantic 422 errors: [{loc: [...], msg: "..."}]
    return detail
      .map((e) => {
        const field = Array.isArray(e.loc) ? e.loc[e.loc.length - 1] : ''
        return field ? `${field}: ${e.msg}` : e.msg
      })
      .join('. ')
  }
  return `Something went wrong (error ${status}).`
}

/**
 * Call the API.
 *   api('/items')                                   GET
 *   api('/items', { method: 'POST', body: {...} })  JSON body
 *   api('/auth/jwt/login', { method: 'POST', form: {...} })  form body (login only)
 */
export async function api(path, { method = 'GET', body, form } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (form) {
    payload = new URLSearchParams(form)
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  } else if (body !== undefined) {
    payload = JSON.stringify(body)
    headers['Content-Type'] = 'application/json'
  }

  let res
  try {
    res = await fetch('/api' + path, { method, headers, body: payload })
  } catch {
    throw new ApiError("Can't reach the server. Is the backend running?", 0)
  }

  if (res.status === 204) return null

  const text = await res.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (!res.ok) {
    if (res.status === 401 && token) {
      // Token expired or invalid: log out everywhere
      clearToken()
      window.dispatchEvent(new Event('auth-expired'))
    }
    throw new ApiError(errorMessage(data, res.status), res.status)
  }
  return data
}

// Some routes return a plain list, others wrap it like {"items": [...]}. Accept both.
export function asList(data, key) {
  if (Array.isArray(data)) return data
  return (data && data[key]) || []
}

export function money(value) {
  const n = Number(value ?? 0)
  return '$' + n.toFixed(2)
}

// The database stores times in UTC without a time zone mark; add one so the browser shows local time
export function formatDate(value) {
  if (!value) return ''
  const hasZone = /[zZ]|[+-]\d\d:?\d\d$/.test(value)
  const date = new Date(hasZone ? value : value + 'Z')
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}
