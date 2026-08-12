(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShellCommon.esc;
  const users = window.MenuFlowUsers;
  let type = 'info';

  // This prototype's real, testable session is one of three fixed accounts
  // (see data/users.js) switched via the Owner/Manager/Admin devtools toggle
  // — there's no real per-account login. So "a specific user" here targets
  // one of those three real sessions rather than the illustrative platform
  // user directory on the Users page, which keeps this genuinely testable:
  // send to Owner, flip the role switcher to Owner, see it land.
  const RECIPIENTS = [
    { id: 'all', label: 'All users', hint: 'Owner, managers, and admins across every restaurant.' },
    { id: users.owner.id, label: `Owner — ${users.owner.name}`, hint: users.owner.email },
    { id: users.manager.id, label: `Manager — ${users.manager.name}`, hint: users.manager.email },
    { id: users.admin.id, label: `Admin — ${users.admin.name}`, hint: users.admin.email },
  ];

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'notifications', title: 'Notifications', subtitle: 'Send an announcement to everyone, or a specific account.' });
    content.innerHTML = `
      <div class="dash-design-grid">
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Compose</h2><p>Delivered instantly to the recipient's notification bell.</p></div></div>
          <form id="composeForm" novalidate>
            <div class="dash-option-group">
              <span>Send to</span>
              <div class="notif-audience-picker">
                ${RECIPIENTS.map((r, i) => `<label><input type="radio" name="audience" value="${r.id}" ${i === 0 ? 'checked' : ''} /> <span><strong>${esc(r.label)}</strong><br><small style="color:var(--dash-text-muted)">${esc(r.hint)}</small></span></label>`).join('')}
              </div>
            </div>
            <div class="dash-option-group">
              <span>Type</span>
              <div class="notif-type-row" id="typeRow">
                ${['info', 'success', 'warning', 'error'].map(t => `<button type="button" data-type="${t}" class="${t === 'info' ? 'active' : ''}">${t}</button>`).join('')}
              </div>
            </div>
            <div class="field"><label for="notifText">Message</label><textarea id="notifText" rows="3" required placeholder="e.g. Scheduled maintenance tonight 11PM–1AM Kuwait time."></textarea></div>
            <button class="btn btn--dark" type="submit" style="margin-top:1rem">Send notification</button>
          </form>
        </div>
        <div class="dash-card">
          <div class="dash-card-header"><div><h2>Sent</h2><p>Every notification pushed from this panel.</p></div></div>
          <ul class="dash-checklist" id="sentList"></ul>
        </div>
      </div>`;

    $$('#typeRow button').forEach(btn => btn.addEventListener('click', () => {
      $$('#typeRow button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      type = btn.dataset.type;
    }));

    $('#composeForm').addEventListener('submit', e => {
      e.preventDefault();
      const text = $('#notifText').value.trim();
      if (!text) return;
      const audience = document.querySelector('input[name="audience"]:checked').value;
      store.pushNotification(type, text, audience);
      const recipient = RECIPIENTS.find(r => r.id === audience);
      window.MenuFlowAdminStore.addAudit('DAIFY Admin', 'Sent notification', `${recipient.label}: ${text.slice(0, 60)}`);
      window.MenuFlowShellCommon.toast(`Notification sent to ${recipient.label}`);
      $('#notifText').value = '';
      renderSent();
    });

    renderSent();
  }

  function renderSent() {
    const list = store.listAllNotifications();
    $('#sentList').innerHTML = list.length
      ? list.map(n => {
          const recipient = RECIPIENTS.find(r => r.id === n.audience) || RECIPIENTS[0];
          return `<li><span class="dash-check-icon" style="background:var(--dash-bg);color:var(--mf-ink);border-color:var(--dash-border)">${n.type.charAt(0).toUpperCase()}</span><span style="flex:1"><strong style="font-weight:600">${esc(n.text)}</strong><br><small style="color:var(--dash-text-muted)">To ${esc(recipient.label)} · ${esc(n.time)}</small></span></li>`;
        }).join('')
      : `<li><span style="flex:1;color:var(--dash-text-muted)">No notifications sent yet.</span></li>`;
  }

  render();
})();
