// Wires checkout/success.html -- where Stripe redirects the buyer back to
// after a successful Checkout Session -- to the real
// GET /api/checkout/session-status endpoint.
//
// There's no webhook anywhere in this app (see checkoutService on the
// backend), so this polling loop is the ONLY place a payment actually gets
// confirmed server-side. A buyer who closes the tab before this finishes
// polling leaves their order stuck on pending_payment until they revisit
// this exact URL (Stripe's success_url, with session_id) again.
//
// session-status only ever returns { status } -- no order/checkout_group_id
// details -- so there's nothing here to build a real order summary from.
// The "View Order" link instead uses the checkout_group_id checkout.js
// stashed in sessionStorage right before redirecting to Stripe; if that's
// missing (e.g. this URL was reopened in a fresh tab/session), the link
// falls back to the account orders page rather than guessing a group id.

const POLL_ATTEMPTS = 5;
const POLL_DELAY_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

document.addEventListener('DOMContentLoaded', async () => {
  const loadingEl = document.getElementById('success-loading');
  const signinRequiredEl = document.getElementById('success-signin-required');
  const notFoundEl = document.getElementById('success-not-found');
  const paidEl = document.getElementById('success-paid');
  const notPaidEl = document.getElementById('success-not-paid');
  const viewOrderLink = document.getElementById('success-view-order-link');

  function showOnly(el) {
    for (const candidate of [loadingEl, signinRequiredEl, notFoundEl, paidEl, notPaidEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');
  if (!sessionId) {
    showOnly(notFoundEl);
    return;
  }

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showOnly(signinRequiredEl);
    return;
  }

  showOnly(loadingEl);

  let status = null;
  let requestFailed = false;

  for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
    const res = await window.MarketplaceAuth.fetchWithAuth(
      `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
    );

    if (!res.ok) {
      requestFailed = true;
      break;
    }

    const body = await res.json();
    status = body.status;
    if (status === 'paid') break;

    if (attempt < POLL_ATTEMPTS - 1) {
      await sleep(POLL_DELAY_MS);
    }
  }

  if (requestFailed || !status) {
    showOnly(notFoundEl);
    return;
  }

  if (status === 'paid') {
    const checkoutGroupId = sessionStorage.getItem('pendingCheckoutGroupId');
    if (checkoutGroupId) {
      viewOrderLink.href = `../order-confirmation.html?checkout_group_id=${encodeURIComponent(checkoutGroupId)}`;
      sessionStorage.removeItem('pendingCheckoutGroupId');
    } else {
      viewOrderLink.href = '../account/orders.html';
    }
    showOnly(paidEl);
    return;
  }

  // Still pending_payment (or some other non-paid status) after every
  // attempt -- say so plainly rather than implying success.
  showOnly(notPaidEl);
});
