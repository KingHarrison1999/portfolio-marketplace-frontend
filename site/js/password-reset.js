document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form-shell-fields');
  const messageEl = document.getElementById('form-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();

    submitBtn.disabled = true;
    await window.MarketplaceAuth.supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/password-update.html`,
    });
    submitBtn.disabled = false;

    // Same message regardless of outcome -- resetPasswordForEmail doesn't
    // reveal whether the address is registered, and neither should this UI.
    showMessage("If an account exists for that email, you'll receive a password reset link shortly.", 'success');
    form.reset();
  });
});
