// Shared Supabase auth client for static pages. Requires the Supabase JS
// CDN script (window.supabase) to be loaded first, without `defer`, before
// this file.

const SUPABASE_URL = 'https://wtjhtsjvbmkanjvgnxvs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0amh0c2p2Ym1rYW5qdmdueHZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MTcxMTQsImV4cCI6MjEwNDQ5MzExNH0.Ad7BmtDgXzM22bY63qQYX0C6adDksZj0iHMd-CXIapQ';
const BACKEND_API_URL = 'https://portfolio-marketplace-backend-production.up.railway.app';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Returns the current session, or null if there isn't one or the check
// fails. Never throws, so callers don't need a try/catch just to render a
// logged-out state.
async function getSession() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
      console.error('Failed to get Supabase session:', error.message);
      return null;
    }
    return data.session;
  } catch (err) {
    console.error('Failed to get Supabase session:', err);
    return null;
  }
}

// fetch() wrapper that attaches the current session's access token as an
// Authorization: Bearer header. Relative paths (e.g. "/api/health") are
// resolved against the backend API; absolute URLs are used as-is. Falls
// back to an unauthenticated request if there's no session, rather than
// throwing, so callers can rely on the backend's own 401 handling.
async function fetchWithAuth(path, options = {}) {
  const session = await getSession();
  const headers = new Headers(options.headers || {});
  if (session) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }
  const url = /^https?:\/\//i.test(path) ? path : `${BACKEND_API_URL}${path}`;
  return fetch(url, { ...options, headers });
}

// Where the header's "Sell Now" button leads, as a path from the site root:
// signed out -> log in (then on to the seller area, see js/login.js);
// a seller or admin -> the new-listing form; anyone else -> the "Become a
// Seller" section of account settings. Never throws.
const SELL_SIGNED_OUT = 'login.html?next=sell';
const SELL_SELLER = 'seller/listing-form.html';
const SELL_BECOME_SELLER = 'account/settings.html#seller-status-section';

async function getSellDestination() {
  const session = await getSession();
  if (!session) return SELL_SIGNED_OUT;
  try {
    const res = await fetchWithAuth('/api/profile');
    if (res.ok) {
      const role = (await res.json()).profile?.role;
      if (role === 'seller' || role === 'admin') return SELL_SELLER;
    }
  } catch (err) {
    console.warn('getSellDestination: profile check failed.', err);
  }
  return SELL_BECOME_SELLER;
}

window.MarketplaceAuth = {
  supabaseClient,
  getSession,
  fetchWithAuth,
  getSellDestination,
};
