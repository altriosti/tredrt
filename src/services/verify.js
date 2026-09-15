import { CONFIG } from '../config.js';

// Fully client-side validation. There is no server in this build: the project
// runs as static files on GitHub Pages.

/** X usernames: 1-15 characters, letters, numbers and underscore only. */
export function isValidXHandle(raw) {
  const h = String(raw || '').trim().replace(/^@/, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(h) ? h : null;
}

/** Reply URL must point at a status on x.com / twitter.com. */
export function isValidReplyUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'x.com' && host !== 'twitter.com') return false;
    return /^\/[A-Za-z0-9_]{1,15}\/status\/\d{5,25}\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Address shape check. No wallet signing is required at this stage. */
export function isValidEthAddress(addr) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(addr || '').trim());
}

/**
 * Sends the entry to the Google Apps Script web app.
 * text/plain avoids a CORS preflight, so the response is readable and
 * duplicate entries can be reported back to the visitor.
 */
export async function submitWhitelist(payload) {
  const endpoint = String(CONFIG.sheetsEndpoint || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec/.test(endpoint)) {
    console.warn('[whitelist] sheetsEndpoint is not a deployed Apps Script /exec URL:', endpoint);
    return { ok: false, reason: 'RELAY NOT CONFIGURED YET' };
  }
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
    const data = await res.json().catch(() => ({}));
    if (data.status === 'duplicate') {
      return { ok: false, reason: 'THIS IDENTITY IS ALREADY RECORDED' };
    }
    if (data.status !== 'ok') return { ok: false, reason: 'TRANSMISSION REJECTED' };
    return { ok: true, id: data.id };
  } catch {
    return { ok: false, reason: 'NO CONNECTION TO THE RELAY' };
  }
}
