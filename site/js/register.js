document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form-shell-fields');
  const messageEl = document.getElementById('form-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  // ?next=sell (from the header's "Sell Now", via login.html): keep it on
  // the "Log in" link, so signing in after verifying the email still goes
  // on to the seller area.
  const fromSellNow = new URLSearchParams(window.location.search).get('next') === 'sell';
  if (fromSellNow) {
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink) loginLink.href = 'login.html?next=sell';
  }

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
    const { data, error } = await window.MarketplaceAuth.supabaseClient.auth.signUp({ email, password });
    submitBtn.disabled = false;

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    // Signed in straight away (no email confirmation required): go on.
    if (fromSellNow && data && data.session) {
      window.location.href = await window.MarketplaceAuth.getSellDestination();
      return;
    }

    showMessage('Check your email to verify your account before logging in.', 'success');
    form.reset();
  });
});
