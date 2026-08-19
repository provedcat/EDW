import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';
export const TOKEN_KEY = 'eundong-sync-token';
export function captureToken(location = window.location, storage = localStorage, history = window.history) {
  const match = location.hash.match(/^#sync=([^&]+)$/); if (!match) return storage.getItem(TOKEN_KEY);
  const token = decodeURIComponent(match[1]); if (token.length >= 32) storage.setItem(TOKEN_KEY, token);
  history.replaceState(null, '', location.pathname + location.search); return token.length >= 32 ? token : null;
}
export class Api {
  constructor(token, fetcher = fetch) { this.token = token; this.fetcher = fetcher; }
  async call(action, payload = {}, signal) {
    const res = await this.fetcher(`${SUPABASE_URL}/functions/v1/eundong-sync`, { method: 'POST', signal, headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json', 'X-Eundong-Sync-Token': this.token }, body: JSON.stringify({ action, ...payload }) });
    let body = {}; try { body = await res.json(); } catch { /* handled below */ }
    if (!res.ok) { const error = new Error(body.error || `HTTP_${res.status}`); error.status = res.status; throw error; } return body;
  }
}
