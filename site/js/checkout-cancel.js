// Wires checkout/cancel.html's "View Order" link -- Stripe's cancel_url is
// the same fixed URL regardless of which page started the payment
// (checkout.js's single-order flow, or a per-order "Pay Now" button on
// order-confirmation.html for a multi-seller cart), so this reads back the
// same pendingCheckoutGroupId sessionStorage key checkout/success.js
// already relies on to get back to the right order-confirmation.html. No
// API call needed here -- cancelling never changes any order's status, so
// there's nothing to confirm or poll for.

document.addEventListener('DOMContentLoaded', () => {
  const link = document.getElementById('cancel-view-order-link');
  if (!link) return;

  const checkoutGroupId = sessionStorage.getItem('pendingCheckoutGroupId');
  if (checkoutGroupId) {
    link.href = `../order-confirmation.html?checkout_group_id=${encodeURIComponent(checkoutGroupId)}`;
  } else {
    // Shouldn't normally happen (checkout.js and order-confirmation.js both
    // set this right before redirecting to Stripe) -- fall back rather than
    // linking to a group id that isn't there.
    link.href = '../account/orders.html';
  }
});
