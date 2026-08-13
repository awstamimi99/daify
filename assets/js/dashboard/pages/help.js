(function () {
  const $ = s => document.querySelector(s);
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;

  function render() {
    const restaurant = store.getActiveRestaurant();
    const content = window.MenuFlowShell.render({ active: 'help', title: 'Help', subtitle: 'Get support or learn how DAIFY works.' });
    content.innerHTML = `
      <div class="dash-quick-actions" style="margin-bottom:1.75rem">
        <a class="dash-quick-action" href="../features.html"><strong>Help Center</strong><span>Guides on menus, design, and publishing.</span></a>
        <a class="dash-quick-action" href="../contact.html"><strong>Contact Support</strong><span>Reach the DAIFY team directly.</span></a>
        <button class="dash-quick-action" type="button" id="reportProblem"><strong>Report a Problem</strong><span>Tell us what went wrong.</span></button>
      </div>
      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Frequently asked</h2></div></div>
        <ul class="dash-checklist">
          <li><span style="flex:1"><strong style="font-weight:600">How do I publish my menu?</strong><br><small style="color:var(--dash-text-muted)">Go to QR &amp; Publish and select "Publish menu" — your changes go live immediately.</small></span></li>
          <li><span style="flex:1"><strong style="font-weight:600">Can I invite staff to help manage the menu?</strong><br><small style="color:var(--dash-text-muted)">Yes — go to Team and invite a manager with exactly the permissions you choose.</small></span></li>
          <li><span style="flex:1"><strong style="font-weight:600">Will changing templates lose my menu content?</strong><br><small style="color:var(--dash-text-muted)">No — templates only change the design. Your sections and dishes stay exactly as they are.</small></span></li>
        </ul>
      </div>`;
    $('#reportProblem').addEventListener('click', () => openReportDialog(restaurant));
  }

  function ensureDialog(id) {
    let dialog = $(`#${id}`);
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = id;
      dialog.className = 'dash-modal';
      document.body.appendChild(dialog);
    }
    return dialog;
  }

  function openReportDialog(restaurant) {
    const dialog = ensureDialog('reportDialog');
    dialog.innerHTML = `<div class="dash-modal-body">
      <h2>Report a problem</h2>
      <form id="reportForm" novalidate>
        <div class="field"><label for="reportSubject">Subject</label><input id="reportSubject" required placeholder="What went wrong?" /></div>
        <div class="field" style="margin-top:1rem"><label for="reportDetail">Details</label><textarea id="reportDetail" rows="4" placeholder="The more detail, the faster we can help."></textarea></div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="submit">Send report</button>
        </div>
      </form>
    </div>`;
    dialog.showModal();
    dialog.querySelector('[data-choice="cancel"]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    $('#reportForm', dialog).addEventListener('submit', e => {
      e.preventDefault();
      const subject = $('#reportSubject', dialog).value.trim();
      if (!subject) return;
      const detail = $('#reportDetail', dialog).value.trim();
      const user = store.currentUser();
      window.MenuFlowAdminStore.tickets.add({
        client: `${user.name} — ${restaurant.name}`,
        userId: user.id,
        subject: detail ? `${subject} — ${detail}` : subject,
        priority: 'Medium',
      });
      store.pushNotification('info', `New support ticket from ${user.name}: ${subject}`, window.MenuFlowUsers.admin.id);
      window.MenuFlowShell.toast('Report sent — our team will follow up by email.');
      dialog.close();
    });
  }

  render();
})();
