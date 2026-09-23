// Wires the "Become a Seller" / "Commission Tier" sections of
// account/settings.html to the real POST /api/profile/become-seller and
// PATCH /api/profile endpoints. Exactly one of the two sections is shown,
// based on the signed-in user's real role (buyers see "Become a Seller",
// sellers see "Commission Tier"; admins see neither -- a commission tier
// isn't a meaningful concept for an admin's own account).
//
// Business/charity rates only take effect at checkout once an admin has
// verified the claim (see checkoutService.js's rateForSeller) --
// self-declaring a tier here does not immediately unlock the discounted
// commission rate, and changing an already-verified tier resets it back to
// unverified (see profileService.js).

document.addEventListener('DOMContentLoaded', async () => {
  const becomeSellerSection = document.getElementById('seller-status-section');
  const becomeSellerForm = document.getElementById('become-seller-form');
  const becomeSellerTierSelect = document.getElementById('become-seller-tier');
  const becomeSellerBtn = document.getElementById('become-seller-btn');
  const becomeSellerMessageEl = document.getElementById('become-seller-message');

  const tierSection = document.getElementById('commission-tier-section');
  const tierStatusEl = document.getElementById('commission-tier-status');
  const tierForm = document.getElementById('commission-tier-form');
  const tierSelect = document.getElementById('commission-tier-select');
  const tierSaveBtn = document.getElementById('commission-tier-save-btn');
  const tierMessageEl = document.getElementById('commission-tier-message');

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `form-message is-visible form-message-${type}`;
  }

  const tierLabels = { individual: 'Individual (standard rate)', business: 'Business', charity: 'Charity' };

  function renderTierStatus(profile) {
    const label = tierLabels[profile.commission_tier] || profile.commission_tier;
    if (profile.commission_tier === 'individual') {
      tierStatusEl.textContent = `Current tier: ${label}`;
      return;
    }

    const status = profile.commission_tier_verified
      ? 'Verified -- the discounted rate applies to your sales.'
      : "Pending verification -- you're charged the standard rate until an admin verifies this.";
    tierStatusEl.textContent = `Current tier: ${label}. ${status}`;
  }

  becomeSellerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    becomeSellerBtn.disabled = true;

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile/become-seller', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_tier: becomeSellerTierSelect.value }),
    });
    const body = await res.json().catch(() => ({}));
    becomeSellerBtn.disabled = false;

    if (!res.ok) {
      showMessage(becomeSellerMessageEl, body.error || 'Failed to become a seller.', 'error');
      return;
    }

    showMessage(becomeSellerMessageEl, "You're now a seller! Reloading...", 'success');
    window.setTimeout(() => window.location.reload(), 1200);
  });

  tierForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    tierSaveBtn.disabled = true;

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commission_tier: tierSelect.value }),
    });
    const body = await res.json().catch(() => ({}));
    tierSaveBtn.disabled = false;

    if (!res.ok) {
      showMessage(tierMessageEl, body.error || 'Failed to update commission tier.', 'error');
      return;
    }

    renderTierStatus(body.profile);
    showMessage(
      tierMessageEl,
      body.profile.commission_tier === 'individual'
        ? 'Commission tier updated.'
        : "Commission tier updated. An admin needs to verify this before the discounted rate applies -- you'll be charged the standard rate until then.",
      'success',
    );
  });

  const session = await window.MarketplaceAuth.getSession();
  if (!session) return; // settings-profile.js already shows a sign-in message on this page

  const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile');
  if (!res.ok) return;
  const body = await res.json();
  const profile = body.profile;

  if (profile.role === 'seller') {
    tierSelect.value = profile.commission_tier || 'individual';
    renderTierStatus(profile);
    tierSection.hidden = false;
  } else if (profile.role === 'buyer') {
    becomeSellerSection.hidden = false;
  }
});
