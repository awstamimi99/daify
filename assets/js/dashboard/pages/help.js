(function () {
  const $ = s => document.querySelector(s);
  const store = window.MenuFlowStore;

  function render() {
    const content = window.MenuFlowShell.render({ active: 'help', title: 'Help', subtitle: 'Get support or learn how MenuFlow works.' });
    content.innerHTML = `
      <div class="dash-quick-actions" style="margin-bottom:1.75rem">
        <a class="dash-quick-action" href="../features.html"><strong>Help Center</strong><span>Guides on menus, design, and publishing.</span></a>
        <a class="dash-quick-action" href="../contact.html"><strong>Contact Support</strong><span>Reach the MenuFlow team directly.</span></a>
        <a class="dash-quick-action" href="#" id="reportProblem"><strong>Report a Problem</strong><span>Tell us what went wrong.</span></a>
      </div>
      <div class="dash-card">
        <div class="dash-card-header"><div><h2>Frequently asked</h2></div></div>
        <ul class="dash-checklist">
          <li><span style="flex:1"><strong style="font-weight:600">How do I publish my menu?</strong><br><small style="color:var(--dash-text-muted)">Go to QR &amp; Publish and select "Publish menu" — your changes go live immediately.</small></span></li>
          <li><span style="flex:1"><strong style="font-weight:600">Can I invite staff to help manage the menu?</strong><br><small style="color:var(--dash-text-muted)">Yes — go to Team and invite a manager with exactly the permissions you choose.</small></span></li>
          <li><span style="flex:1"><strong style="font-weight:600">Will changing templates lose my menu content?</strong><br><small style="color:var(--dash-text-muted)">No — templates only change the design. Your sections and dishes stay exactly as they are.</small></span></li>
        </ul>
      </div>`;
    $('#reportProblem').addEventListener('click', e => {
      e.preventDefault();
      window.MenuFlowShell.toast('Problem reports will route to support once the backend is connected.');
    });
  }

  render();
})();
