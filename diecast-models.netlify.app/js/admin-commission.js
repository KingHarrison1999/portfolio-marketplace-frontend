// Wires the admin commission settings page to the real
// GET/PATCH /api/admin/commission-settings endpoint, covering all three
// tiers: flat_rate (individual/default, required), business_rate, and
// charity_rate (both optional -- null until an admin actually sets them,
// see the backend migration).
//
// Each stored value is a raw decimal fraction (0 to 1, e.g. 0.1 = 10%) --
// this page shows/edits them as percentages for readability, converting
// with a plain *100 / /100 (exact, lossless at this precision), and each
// field's hint line always shows the real stored decimal so the
// conversion is never ambiguous about what's actually being saved. A
// blank business/charity field is omitted from the PATCH body entirely
// (leaves that tier's stored value untouched) rather than sent as 0,
// since blank here means "no value entered," not "zero commission."
//
// Per the task: since payments aren't live, none of these rates are
// applied to any real transaction yet -- that's expected, not a gap, and
// the page says so rather than implying otherwise. Which tier a seller
// actually falls into is a separate, still-open decision -- out of scope
// here on purpose.

const RATE_FIELDS = [
  { key: 'flat_rate', inputId: 'commission-rate', hintId: 'commission-rate-hint', required: true },
  { key: 'business_rate', inputId: 'business-rate', hintId: 'business-rate-hint', required: false },
  { key: 'charity_rate', inputId: 'charity-rate', hintId: 'charity-rate-hint', required: false },
];

document.addEventListener('DOMContentLoaded', async () => {
  const signinRequiredEl = document.getElementById('commission-signin-required');
  const forbiddenEl = document.getElementById('commission-forbidden');
  const contentEl = document.getElementById('commission-content');

  const form = document.getElementById('commission-form');
  const saveBtn = document.getElementById('commission-save-btn');
  const messageEl = document.getElementById('commission-form-message');

  const fields = RATE_FIELDS.map((field) => ({
    ...field,
    input: document.getElementById(field.inputId),
    hint: document.getElementById(field.hintId),
  }));

  function showOnly(el) {
    for (const candidate of [signinRequiredEl, forbiddenEl, contentEl]) {
      candidate.hidden = candidate !== el;
    }
  }

  function showMessage(text, type) {
    messageEl.textContent = text;
    messageEl.className = `form-message is-visible form-message-${type}`;
  }

  function formatPercent(percent) {
    return Number.isInteger(percent) ? String(percent) : percent.toFixed(2);
  }

  function updateHint(field) {
    const percent = Number(field.input.value);
    if (field.input.value.trim() === '' || Number.isNaN(percent)) {
      field.hint.textContent = field.required
        ? 'Stored as a decimal fraction of the sale price (e.g. 10% -> 0.10).'
        : 'Not set yet -- leave blank to leave this tier unset.';
      return;
    }
    field.hint.textContent = `Will be stored as ${field.key} = ${(percent / 100).toFixed(4)}`;
  }

  function setFieldFromDecimal(field, decimalValueOrNull) {
    if (decimalValueOrNull === null || decimalValueOrNull === undefined) {
      field.input.value = '';
    } else {
      field.input.value = formatPercent(Number(decimalValueOrNull) * 100);
    }
    updateHint(field);
  }

  for (const field of fields) {
    field.input.addEventListener('input', () => updateHint(field));
  }

  async function loadSettings() {
    const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/commission-settings');
    if (!res.ok) {
      showMessage('Failed to load commission settings.', 'error');
      return;
    }
    const body = await res.json();
    for (const field of fields) {
      setFieldFromDecimal(field, body.commission_settings[field.key]);
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveBtn.disabled = true;
    messageEl.className = 'form-message';

    const payload = {};
    for (const field of fields) {
      const raw = field.input.value.trim();
      if (raw === '') {
        // required (flat_rate): send null so the backend's own real
        // "flat_rate must be a number between 0 and 1" error surfaces
        // inline rather than silently omitting a required field.
        // optional: omit entirely -- leaves that tier untouched.
        if (field.required) payload[field.key] = null;
        continue;
      }
      const percent = Number(raw);
      payload[field.key] = Number.isNaN(percent) ? null : percent / 100;
    }

    const res = await window.MarketplaceAuth.fetchWithAuth('/api/admin/commission-settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    saveBtn.disabled = false;

    if (!res.ok) {
      showMessage(body.error || 'Failed to save commission rates.', 'error');
      return;
    }

    for (const field of fields) {
      setFieldFromDecimal(field, body.commission_settings[field.key]);
    }
    showMessage('Commission rates saved.', 'success');
  });

  const guard = await window.AdminGuard.check();
  if (!guard.ok) {
    showOnly(guard.reason === 'signin' ? signinRequiredEl : forbiddenEl);
    return;
  }

  await loadSettings();
  showOnly(contentEl);
});
