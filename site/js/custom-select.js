// Progressively enhances <select class="js-custom-select"> into an
// accessible custom listbox. Why this exists: a native <select>'s option
// hover/highlight color is controlled entirely by the OS/browser and can't
// be styled with CSS in any browser -- there's no way to make it green to
// match the rest of the site without replacing the control itself.
//
// The original <select> stays in the DOM (hidden, not removed), so any
// existing code that reads/writes its `.value` or listens for `change`
// keeps working completely unmodified -- this file doesn't assume
// anything about what else uses the select, and nothing else needs to
// know this enhancement exists. Programmatic `select.value = x` from
// other code is caught by shimming the `value` accessor on that one
// element instance (not the prototype -- other selects on the page are
// untouched), so the custom UI re-syncs itself even when something other
// than a click on this widget changes the value.
(function () {
  function enhance(select) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select';

    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'custom-select-trigger';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');

    const valueSpan = document.createElement('span');
    valueSpan.className = 'custom-select-value';
    trigger.appendChild(valueSpan);

    const caret = document.createElement('i');
    caret.className = 'fa-solid fa-chevron-down custom-select-caret';
    caret.setAttribute('aria-hidden', 'true');
    trigger.appendChild(caret);

    const menu = document.createElement('ul');
    menu.className = 'custom-select-menu';
    menu.setAttribute('role', 'listbox');
    menu.tabIndex = -1;
    menu.hidden = true;

    const options = Array.from(select.options).map((opt, i) => {
      const li = document.createElement('li');
      li.className = 'custom-select-option';
      li.id = `${select.id || 'custom-select'}-option-${i}`;
      li.setAttribute('role', 'option');
      li.dataset.value = opt.value;
      li.textContent = opt.textContent;
      menu.appendChild(li);
      return li;
    });

    wrapper.appendChild(trigger);
    wrapper.appendChild(menu);
    select.insertAdjacentElement('beforebegin', wrapper);

    // The page's existing "Sort by" <label for="..."> now describes a
    // hidden element -- re-point its accessible association at the
    // visible trigger button instead, and make clicking the label focus
    // it (the native label-click-focuses-control behavior doesn't reach
    // into a hidden select).
    const existingLabel = select.id ? document.querySelector(`label[for="${select.id}"]`) : null;
    if (existingLabel) {
      if (!existingLabel.id) existingLabel.id = `${select.id}-label`;
      trigger.setAttribute('aria-labelledby', existingLabel.id);
      existingLabel.addEventListener('click', () => trigger.focus());
    }

    select.hidden = true;
    select.setAttribute('aria-hidden', 'true');
    select.tabIndex = -1;

    let highlighted = -1;

    function syncFromValue() {
      const current = select.value;
      highlighted = -1;
      options.forEach((li, i) => {
        const selected = li.dataset.value === current;
        li.setAttribute('aria-selected', String(selected));
        if (selected) {
          highlighted = i;
          valueSpan.textContent = li.textContent;
        }
      });
    }

    function setHighlighted(index) {
      highlighted = index;
      options.forEach((li, i) => li.classList.toggle('is-highlighted', i === index));
      const el = options[index];
      if (el) {
        menu.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
      }
    }

    function openMenu() {
      wrapper.classList.add('is-open');
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      setHighlighted(highlighted < 0 ? 0 : highlighted);
      menu.focus();
    }

    function closeMenu() {
      wrapper.classList.remove('is-open');
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
    }

    function choose(index) {
      const li = options[index];
      if (!li) return;
      const changed = select.value !== li.dataset.value;
      select.value = li.dataset.value; // goes through the shimmed setter below
      closeMenu();
      trigger.focus();
      if (changed) {
        select.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    trigger.addEventListener('click', () => {
      if (wrapper.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    trigger.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openMenu();
      }
    });

    menu.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted(Math.min(highlighted + 1, options.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(Math.max(highlighted - 1, 0));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setHighlighted(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setHighlighted(options.length - 1);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        choose(highlighted);
      } else if (e.key === 'Escape' || e.key === 'Tab') {
        closeMenu();
        trigger.focus();
      }
    });

    options.forEach((li, i) => {
      li.addEventListener('click', () => choose(i));
      li.addEventListener('mouseenter', () => setHighlighted(i));
    });

    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) closeMenu();
    });

    const nativeValue = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
    Object.defineProperty(select, 'value', {
      configurable: true,
      get() {
        return nativeValue.get.call(select);
      },
      set(v) {
        nativeValue.set.call(select, v);
        syncFromValue();
      },
    });

    syncFromValue();
  }

  function init() {
    document.querySelectorAll('select.js-custom-select').forEach(enhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
