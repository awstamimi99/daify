(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const tickets = window.MenuFlowAdminSeed.supportTickets;
  let filter = 'all';

  function statusKind(s) {
    return { Open: 'danger', 'In Progress': 'warning', Resolved: 'success' }[s] || 'neutral';
  }

  function render() {
    const content = window.MenuFlowAdminShell.render({ active: 'support', title: 'Support', subtitle: 'Prototype support queue.' });
    content.innerHTML = `
      <div class="dash-filter-bar">
        <button class="dash-filter-chip active" data-filter="all">All</button>
        <button class="dash-filter-chip" data-filter="Open">Open</button>
        <button class="dash-filter-chip" data-filter="In Progress">In Progress</button>
        <button class="dash-filter-chip" data-filter="Resolved">Resolved</button>
      </div>
      <div id="tableWrap"></div>`;
    $$('.dash-filter-chip').forEach(chip => chip.addEventListener('click', () => {
      $$('.dash-filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      filter = chip.dataset.filter;
      renderTable();
    }));
    renderTable();
  }

  function renderTable() {
    const rows = tickets.filter(t => filter === 'all' || t.status === filter);
    $('#tableWrap').innerHTML = `<div class="dash-table-wrap"><table class="dash-table"><thead><tr><th>ID</th><th>Client</th><th>Subject</th><th>Priority</th><th>Status</th><th>Created</th><th></th></tr></thead><tbody>
      ${rows.map(t => `<tr data-id="${t.id}">
        <td data-label="ID" class="cell-muted">${t.id}</td>
        <td data-label="Client" class="cell-primary">${t.client}</td>
        <td data-label="Subject">${t.subject}</td>
        <td data-label="Priority"><span class="status-badge status-badge--${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'neutral'}">${t.priority}</span></td>
        <td data-label="Status"><span class="status-badge status-badge--${statusKind(t.status)}">${t.status}</span></td>
        <td data-label="Created" class="cell-muted">${t.created}</td>
        <td data-label="" class="cell-actions">${t.status !== 'Resolved' ? `<button class="icon-btn" type="button" data-action="resolve" title="Mark resolved">✓</button>` : ''}</td>
      </tr>`).join('')}
    </tbody></table></div>`;

    $$('[data-action="resolve"]').forEach(btn => btn.addEventListener('click', () => {
      const ticket = tickets.find(t => t.id === btn.closest('tr').dataset.id);
      ticket.status = 'Resolved';
      window.MenuFlowShellCommon.toast(`${ticket.id} marked resolved`);
      renderTable();
    }));
  }

  render();
})();
