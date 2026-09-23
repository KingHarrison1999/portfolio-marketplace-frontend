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
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const { error } = await window.MarketplaceAuth.supabaseClient.auth.signUp({ email, password });
    submitBtn.disabled = false;

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Check your email to verify your account before logging in.', 'success');
    form.reset();
  });
});
