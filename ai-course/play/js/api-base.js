// Resolve API base URL.
// When game is served from a different origin than backend (e.g. timzinin.com via GH Pages),
// API calls must go to the FastAPI VPS via absolute URL with CORS.
// When served from the FastAPI itself (TMA in Telegram via bot WebApp), relative paths work.

const BACKEND_HOST = 'ai-course.185-202-239-165.sslip.io';
const BACKEND_BASE = `https://${BACKEND_HOST}`;

export function apiUrl(path) {
  const isAbsolute = /^https?:\/\//i.test(path);
  if (isAbsolute) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  // Same-origin or hostname matches backend → relative path is fine
  if (typeof window !== 'undefined' && window.location?.hostname === BACKEND_HOST) {
    return cleanPath;
  }
  return `${BACKEND_BASE}${cleanPath}`;
}
