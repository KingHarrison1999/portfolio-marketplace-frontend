document.addEventListener('DOMContentLoaded', () => {
  const checkingEl = document.getElementById('recovery-checking');
  const formEl = document.getElementById('recovery-form');
  const invalidEl = document.getElementById('recovery-invalid');
  const messageEl = document.getElementById('form-message');
  const submitBtn = formEl.querySelector('button[type="submit"]');

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  function showInvalidLink() {
    checkingEl.hidden = true;
    formEl.hidden = true;
    invalidEl.hidden = false;
  }

  function showForm() {
    checkingEl.hidden = true;
    invalidEl.hidden = true;
    formEl.hidden = false;
  }

  // An expired or already-used link redirects here with an error in the URL
  // hash rather than triggering an auth event, so that has to be checked for
  // explicitly before waiting on PASSWORD_RECOVERY.
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  if (hashParams.get('error') || hashParams.get('error_code')) {
    showInvalidLink();
    return;
  }

  let resolved = false;

  window.MarketplaceAuth.supabaseClient.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') {
      resolved = true;
      showForm();
    }
  });

  // Supabase-js parses the recovery token from the URL automatically on
  // load; if that hasn't produced a PASSWORD_RECOVERY event within a few
  // seconds, treat the link as invalid rather than leaving the "checking"
  // state up forever.
  setTimeout(() => {
    if (!resolved) {
      showInvalidLink();
    }
  }, 5000);

  formEl.addEventListener('submit', async (event) => {
    event.preventDefault();

    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
      showMessage('Passwords do not match.', 'error');
      return;
    }

    submitBtn.disabled = true;
    const { error } = await window.MarketplaceAuth.supabaseClient.auth.updateUser({ password });

    if (error) {
      submitBtn.disabled = false;
      showMessage(error.message, 'error');
      return;
    }

    showMessage('Your password has been updated. Redirecting to log in…', 'success');
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 3000);
  });
});
