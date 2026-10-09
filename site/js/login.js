document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.form-shell-fields');
  const messageEl = document.getElementById('form-message');
  const submitBtn = form.querySelector('button[type="submit"]');

  // ?next=sell: arrived from the header's "Sell Now". After signing in, go
  // on to the seller area (or "Become a Seller") instead of the dashboard,
  // and keep the destination if they choose to register instead. Only this
  // one fixed value is accepted, so the param can't send anyone off-site.
  const fromSellNow = new URLSearchParams(window.location.search).get('next') === 'sell';
  if (fromSellNow) {
    const registerLink = document.querySelector('a[href="register.html"]');
    if (registerLink) registerLink.href = 'register.html?next=sell';
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    submitBtn.disabled = true;
    const { error } = await window.MarketplaceAuth.supabaseClient.auth.signInWithPassword({ email, password });
    submitBtn.disabled = false;

    if (error) {
      showMessage(error.message, 'error');
      return;
    }

    window.location.href = fromSellNow ? await window.MarketplaceAuth.getSellDestination() : 'account/dashboard.html';
  });
});
