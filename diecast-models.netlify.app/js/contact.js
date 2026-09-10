// Wires contact.html to the real POST /api/contact endpoint (sends a real
// email to the business inbox). No auth.js on this page -- the endpoint is
// public, so a plain fetch against the same backend origin auth.js itself
// points at is enough.
const CONTACT_API_URL = 'https://marketplace-backend-starter-production.up.railway.app/api/contact';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const messageInput = document.getElementById('message');
  const submitBtn = document.getElementById('contact-submit-btn');
  const messageEl = document.getElementById('contact-form-message');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    submitBtn.disabled = true;

    const res = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        message: messageInput.value.trim(),
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(body.error || 'Failed to send your message. Please try again.', 'error');
      submitBtn.disabled = false;
      return;
    }

    form.reset();
    submitBtn.disabled = false;
    showMessage("Message sent -- we'll get back to you soon.", 'success');
  });
});
