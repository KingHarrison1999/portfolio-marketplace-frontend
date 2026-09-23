// Wires the "Profile" and "Notification Preferences" sections of
// account/settings.html to the real GET/PATCH /api/profile and
// GET/PATCH /api/notification-preferences endpoints, plus "Change
// Password" (real Supabase Auth password update, re-verified against the
// entered current password first) and "Delete Account" (real
// DELETE /api/profile -- blocked with a real 409 if the account is a
// seller who has sold anything, see profileService.js).

document.addEventListener('DOMContentLoaded', async () => {
  // --- Profile ---
  const profileForm = document.getElementById('profile-form');
  const nameInput = document.getElementById('name');
  const emailInput = document.getElementById('email');
  const bioInput = document.getElementById('profile-bio');
  const avatarUrlInput = document.getElementById('profile-avatar-url');
  const profileSaveBtn = document.getElementById('profile-save-btn');
  const profileMessageEl = document.getElementById('profile-form-message');

  // --- Notification preferences ---
  const notifyOrdersInput = document.getElementById('notify-orders');
  const notifyPromoInput = document.getElementById('notify-promo');
  const notificationSaveBtn = document.getElementById('notification-save-btn');
  const notificationMessageEl = document.getElementById('notification-form-message');

  // --- Change password ---
  const changePasswordForm = document.getElementById('change-password-form');
  const currentPasswordInput = document.getElementById('current-password');
  const newPasswordInput = document.getElementById('new-password');
  const confirmPasswordInput = document.getElementById('confirm-password');
  const changePasswordBtn = document.getElementById('change-password-btn');
  const changePasswordMessageEl = document.getElementById('change-password-message');

  // --- Delete account ---
  const deleteAccountBtn = document.getElementById('delete-account-btn');
  const deleteAccountMessageEl = document.getElementById('delete-account-message');

  function showMessage(el, text, type) {
    el.textContent = text;
    el.className = `form-message is-visible form-message-${type}`;
  }

  async function loadProfile() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile');
    if (!res.ok) {
      showMessage(profileMessageEl, 'Failed to load your profile.', 'error');
      return;
    }
    const body = await res.json();
    nameInput.value = body.profile.display_name || '';
    emailInput.value = body.profile.email || '';
    bioInput.value = body.profile.bio || '';
    avatarUrlInput.value = body.profile.avatar_url || '';
  }

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    profileSaveBtn.disabled = true;

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        display_name: nameInput.value.trim(),
        bio: bioInput.value.trim(),
        avatar_url: avatarUrlInput.value.trim(),
      }),
    });
    profileSaveBtn.disabled = false;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(profileMessageEl, body.error || 'Failed to save profile.', 'error');
      return;
    }

    const body = await res.json();
    nameInput.value = body.profile.display_name || '';
    bioInput.value = body.profile.bio || '';
    avatarUrlInput.value = body.profile.avatar_url || '';
    showMessage(profileMessageEl, 'Profile saved.', 'success');
  });

  async function loadNotificationPreferences() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/notification-preferences');
    if (!res.ok) {
      showMessage(notificationMessageEl, 'Failed to load notification preferences.', 'error');
      return;
    }
    const body = await res.json();
    notifyOrdersInput.checked = !!body.notification_preferences.email_order_updates;
    notifyPromoInput.checked = !!body.notification_preferences.email_marketing;
  }

  notificationSaveBtn.addEventListener('click', async () => {
    notificationSaveBtn.disabled = true;

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/notification-preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email_order_updates: notifyOrdersInput.checked,
        email_marketing: notifyPromoInput.checked,
      }),
    });
    notificationSaveBtn.disabled = false;

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(notificationMessageEl, body.error || 'Failed to save preferences.', 'error');
      return;
    }

    const body = await res.json();
    notifyOrdersInput.checked = !!body.notification_preferences.email_order_updates;
    notifyPromoInput.checked = !!body.notification_preferences.email_marketing;
    showMessage(notificationMessageEl, 'Preferences saved.', 'success');
  });

  changePasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    if (newPassword !== confirmPassword) {
      showMessage(changePasswordMessageEl, 'New passwords do not match.', 'error');
      return;
    }

    changePasswordBtn.disabled = true;

    // A signed-in session's own auth.updateUser() doesn't require the
    // current password on its own -- re-verify it first via a real sign-in
    // attempt, so changing the password on an already-unlocked device
    // still requires knowing it.
    const session = await window.MarketplaceAuth.getSession();
    const { error: reauthError } = await window.MarketplaceAuth.supabaseClient.auth.signInWithPassword({
      email: session.user.email,
      password: currentPassword,
    });

    if (reauthError) {
      changePasswordBtn.disabled = false;
      showMessage(changePasswordMessageEl, 'Current password is incorrect.', 'error');
      return;
    }

    const { error } = await window.MarketplaceAuth.supabaseClient.auth.updateUser({ password: newPassword });
    changePasswordBtn.disabled = false;

    if (error) {
      showMessage(changePasswordMessageEl, error.message, 'error');
      return;
    }

    changePasswordForm.reset();
    showMessage(changePasswordMessageEl, 'Password updated.', 'success');
  });

  deleteAccountBtn.addEventListener('click', async () => {
    if (!window.confirm('Delete your account? This is permanent and cannot be undone.')) return;

    deleteAccountBtn.disabled = true;
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/profile', { method: 'DELETE' });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      showMessage(deleteAccountMessageEl, body.error || 'Failed to delete account.', 'error');
      deleteAccountBtn.disabled = false;
      return;
    }

    await window.MarketplaceAuth.supabaseClient.auth.signOut();
    window.location.href = '../index.html';
  });

  const session = await window.MarketplaceAuth.getSession();
  if (!session) {
    showMessage(profileMessageEl, 'Log in to manage your profile.', 'error');
    showMessage(notificationMessageEl, 'Log in to manage your notification preferences.', 'error');
    profileSaveBtn.disabled = true;
    notificationSaveBtn.disabled = true;
    changePasswordBtn.disabled = true;
    deleteAccountBtn.disabled = true;
    return;
  }

  await loadProfile();
  await loadNotificationPreferences();
});
