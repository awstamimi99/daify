/**
 * Toast + confirm-dialog + escape helpers shared by both the owner/manager
 * shell (shell.js) and the admin shell (admin-shell.js), so the two don't
 * duplicate this logic.
 */
(function () {
  const $ = s => document.querySelector(s);

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(text, kind) {
    let el = $('.dash-save-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'dash-save-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle('error', kind === 'error');
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function confirmDialog({ title, message, confirmLabel, danger }) {
    return new Promise(resolve => {
      let dialog = $('#globalConfirmDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'globalConfirmDialog';
        dialog.className = 'dash-modal';
        document.body.appendChild(dialog);
      }
      dialog.innerHTML = `
        <div class="dash-modal-body">
          <div class="dash-confirm-icon ${danger ? '' : 'neutral'}">${danger ? '!' : '?'}</div>
          <div class="dash-confirm-body">
            <h2 style="margin-bottom:.3rem">${esc(title)}</h2>
            <p>${esc(message)}</p>
          </div>
          <div class="dash-modal-actions">
            <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--dark'}" type="button" data-choice="confirm">${esc(confirmLabel || 'Confirm')}</button>
          </div>
        </div>`;
      dialog.showModal();
      const onClick = event => {
        const choice = event.target.dataset.choice;
        if (!choice && event.target !== dialog) return;
        dialog.removeEventListener('click', onClick);
        dialog.close();
        resolve(choice === 'confirm');
      };
      dialog.addEventListener('click', onClick);
    });
  }

  function menuWorkspaceTabs(active, menuId) {
    const q = menuId ? `?menu=${encodeURIComponent(menuId)}` : '';
    return [
      { id: 'content', label: 'Content', href: `menu-builder.html${q}` },
      { id: 'design', label: 'Design', href: `design.html${q}` },
      { id: 'publish', label: 'Publish', href: `publish.html${q}` },
    ].map(tab => Object.assign({}, tab, { active: tab.id === active }));
  }

  window.MenuFlowShellCommon = { toast, confirmDialog, esc, menuWorkspaceTabs };
})();
