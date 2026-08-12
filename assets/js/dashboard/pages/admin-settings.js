(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const content = window.MenuFlowAdminShell.render({ active: 'settings', title: 'Platform Settings', subtitle: 'System-wide configuration.' });

  const toggles = [
    ['New signups enabled', true],
    ['Maintenance mode', false],
    ['Require email verification', true],
    ['Allow trial without credit card', true],
  ];

  content.innerHTML = `
    <div class="dash-card" style="margin-bottom:1.75rem">
      <div class="dash-card-header"><div><h2>Platform toggles</h2></div></div>
      <div class="dash-checklist">
        ${toggles.map(([label, on]) => `<li><span style="flex:1">${label}</span><label class="toggle"><input type="checkbox" ${on ? 'checked' : ''} /><span class="toggle-track"></span></label></li>`).join('')}
      </div>
    </div>
    <div class="dash-card">
      <div class="dash-card-header"><div><h2>Defaults</h2></div></div>
      <div class="field-row">
        <div class="field"><label for="trialLength">Default trial length (days)</label><input id="trialLength" type="number" value="14" /></div>
        <div class="field"><label for="supportEmail">Support email</label><input id="supportEmail" type="email" value="support@daify.net" /></div>
      </div>
      <button class="btn btn--dark" type="button" id="saveBtn" style="margin-top:.5rem">Save settings</button>
    </div>`;

  $$('.toggle input').forEach(t => t.addEventListener('change', () => window.MenuFlowShellCommon.toast('Setting updated')));
  $('#saveBtn').addEventListener('click', () => window.MenuFlowShellCommon.toast('Platform settings saved'));
})();
