const DEFAULT_DEV_BACKEND = 'http://localhost:3000';

export function resolveApiUrl(path, baseUrl = import.meta.env.VITE_API_BASE_URL) {
  const safePath = path.startsWith('/') ? path : `/${path}`;

  if (baseUrl) {
    return new URL(safePath, `${baseUrl.replace(/\/$/, '')}/`).toString();
  }

  if (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return `${DEFAULT_DEV_BACKEND}${safePath}`;
  }

  return safePath;
}

function ensureJsonBody(body, headers) {
  if (body === undefined || body === null || body === '') {
    return undefined;
  }

  if (body instanceof FormData) {
    return body;
  }

  if (typeof body === 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return body;
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return JSON.stringify(body);
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem('brayano_session');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem('brayano_session', JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem('brayano_session');
}

export async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const storedSession = getStoredSession();

  if (storedSession?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${storedSession.token}`);
  }

  const fetchOptions = {
    ...options,
    headers,
  };

  const body = ensureJsonBody(options.body, headers);
  if (body !== undefined) {
    fetchOptions.body = body;
  }

  const url = resolveApiUrl(path, import.meta.env.VITE_API_BASE_URL);
  const response = await fetch(url, fetchOptions);

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : await response.text().catch(() => '');

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'La requête a échoué.';
    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  return payload;
}

export function isNetworkError(error) {
  const message = error?.message || '';
  return /failed to fetch|fetch|network/i.test(message);
}
