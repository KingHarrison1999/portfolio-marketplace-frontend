// Wires every page's footer "Newsletter" form to the real
// POST /api/newsletter/subscribe endpoint. One shared script (loaded on
// every page, since the form itself is in the shared footer markup) rather
// than a per-page file -- selects by class, not id, since the form has no
// id and appears once per page.
//
// Doesn't use window.MarketplaceAuth.fetchWithAuth -- this needs to work
// even on pages that don't load auth.js (e.g. contact.html), and the
// endpoint is public anyway, so a plain fetch against the same backend
// origin auth.js itself points at is simpler and has no real downside.
const NEWSLETTER_API_URL = 'https://marketplace-backend-starter-production.up.railway.app/api/newsletter/subscribe';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.newsletter');
  if (!form) return;

  const input = form.querySelector('input[type="email"]');
  const button = form.querySelector('button');
  const messageEl = document.querySelector('.newsletter-message');

  function showMessage(text) {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.hidden = false;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = input.value.trim();
    if (!email) return;

    button.disabled = true;
    const res = await fetch(NEWSLETTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    button.disabled = false;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(body.error || 'Failed to subscribe. Please try again.');
      return;
    }

    input.value = '';
    showMessage('Subscribed! Thanks for joining.');
  });
});
