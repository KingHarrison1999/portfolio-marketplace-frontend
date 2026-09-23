// Shared real access check for every admin page: requires a logged-in
// session AND a real profiles.role === 'admin' (via GET /api/profile),
// matching the backend's own requireRole(['admin']) gate on every
// /api/admin/* and category-write route. Previously these pages had none
// at all -- any URL-guesser could open them, though every actual write
// still 403'd against the real backend since there was no bypassing that.
//
// Usage: each admin page includes this after auth.js, then calls
// window.AdminGuard.check() and shows/hides its own
// #admin-signin-required / #admin-forbidden / #admin-content elements
// based on the result -- same three-state pattern used on the seller
// pages.
async function checkAdminAccess() {
  const session = await window.MarketplaceAuth.getSession();
  if (!session) return { ok: false, reason: 'signin' };

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile');
  if (!res.ok) return { ok: false, reason: 'signin' };

  const body = await res.json();
  if (body.profile.role !== 'admin') return { ok: false, reason: 'forbidden' };

  return { ok: true, profile: body.profile };
}

window.AdminGuard = { check: checkAdminAccess };
