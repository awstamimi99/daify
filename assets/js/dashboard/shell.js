(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  function initShell() {
    const toggle = $('.dash-menu-toggle');
    const sidebar = $('.dash-sidebar');
    toggle?.addEventListener('click', () => sidebar.classList.toggle('open'));
    $$('.dash-nav a').forEach(a => a.addEventListener('click', () => sidebar.classList.remove('open')));

    $('#dashLogout')?.addEventListener('click', event => {
      event.preventDefault();
      if (confirm('Log out of this MenuFlow demo? Your saved menu stays on this device.')) {
        window.location.href = '../login.html';
      }
    });

    $('#dashReset')?.addEventListener('click', event => {
      event.preventDefault();
      if (confirm('Reset all dashboard changes back to the Oliva demo data? This cannot be undone.')) {
        window.MenuFlowStore.reset();
        window.location.reload();
      }
    });

    const state = window.MenuFlowStore?.getState();
    if (state) {
      $$('[data-restaurant-name]').forEach(el => { el.textContent = state.restaurant.name; });
    }
  }

  window.MenuFlowDashShell = { showToast };

  function showToast(text) {
    let toast = $('.dash-save-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'dash-save-toast';
      toast.setAttribute('role', 'status');
      document.body.appendChild(toast);
    }
    toast.textContent = text || 'Saved';
    toast.classList.add('show');
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', initShell) : initShell();
})();
