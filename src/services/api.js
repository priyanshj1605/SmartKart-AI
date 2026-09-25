const API_URL = 'http://127.0.0.1:8000'

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem('smartkart_user'))
  } catch {
    return null
  }
}

export function saveSession(data) {
  localStorage.setItem('smartkart_user', JSON.stringify({
    id: data.user?.id,
    email: data.user?.email,
    name: data.user?.name,
    token: data.token,
  }))
}

export async function apiFetch(path, options = {}) {
  const session = getSession()
  const headers = new Headers(options.headers || {})
  if (session?.token) headers.set('Authorization', `Bearer ${session.token}`)
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  let response
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error('Server is unavailable. Please try again.')
  }
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || 'Request failed')
  }
  return response.status === 204 ? null : response.json()
}

export function jsonBody(value) {
  return JSON.stringify(value)
}
