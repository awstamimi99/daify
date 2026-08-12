(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];
  const store = window.MenuFlowStore;
  const esc = window.MenuFlowShell.esc;
  const canPublish = store.can(window.MenuFlowPermissions.PERMISSIONS.MENU_PUBLISH);
  const canManageQr = store.can(window.MenuFlowPermissions.PERMISSIONS.QR_MANAGE);

  let restaurant, menuId;
  let cardStyle = { showLogo: true, showName: true, cta: 'Scan to view our menu' };
  let cardVariant = 'table';

  function currentMenu() {
    return store.getMenu(menuId, restaurant.id);
  }

  function liveUrl(menu) {
    const theme = menu.publishedSnapshot?.theme || {};
    const params = new URLSearchParams();
    if (Object.keys(theme).length) params.set('theme', JSON.stringify(theme));
    const query = params.toString();
    return `${location.origin}/templates/${(menu.publishedSnapshot?.template) || menu.template}.html${query ? '?' + query : ''}`;
  }

  function init() {
    restaurant = store.getActiveRestaurant();
    store.updateRestaurantFlags(restaurant.id, { qrViewed: true });
    const params = new URLSearchParams(location.search);
    const menus = Object.values(restaurant.menus);
    menuId = params.get('menu') && restaurant.menus[params.get('menu')] ? params.get('menu') : (menus.find(m => m.id === 'main-menu') || menus[0])?.id;

    const content = window.MenuFlowShell.render({
      active: 'publish',
      title: 'QR & Publish',
      breadcrumb: esc(restaurant.name),
      subtitle: 'One code, always pointing at your latest menu.',
      workspaceTabs: menuId ? window.MenuFlowShellCommon.menuWorkspaceTabs('publish', menuId) : undefined,
    });
    if (!window.MenuFlowShell.requirePermission(window.MenuFlowPermissions.PERMISSIONS.QR_VIEW, content)) return;

    if (!menuId) {
      content.innerHTML = `<div class="dash-card"><div class="dash-empty-state"><h3>No menu yet</h3><p>Create a menu first.</p><a class="btn btn--dark" href="menus.html">Go to Menus</a></div></div>`;
      return;
    }

    content.innerHTML = `<div id="publishBody"></div>`;
    renderBody();
    const stage = params.get('stage') || (currentMenu().status === 'published' ? 'qr' : 'publish');
    const publishing = stage !== 'qr';
    window.MenuFlowShellCommon.showGuide({
      step: publishing ? 'STEP 08 OF 09' : 'STEP 09 OF 09',
      title: publishing ? 'Put your menu live' : 'Bring it to every table',
      message: publishing
        ? 'Publish when the preview feels right. Your live link and permanent QR code will appear next.'
        : 'Download the QR in the format you need. The same code stays current whenever your menu changes.',
      actionLabel: publishing ? 'Review publishing' : 'See QR downloads',
      action: () => (publishing ? $('#publishBtn') : $('#downloadPngBtn'))?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    });
  }

  function renderBody() {
    const menu = currentMenu();
    const unpublished = store.hasUnpublishedChanges(menu);
    const published = menu.status === 'published';

    $('#publishBody').innerHTML = `
      <div class="dash-card" style="margin-bottom:1.75rem">
        <div class="dash-card-header">
          <div>
            <h2>${esc(menu.name)}</h2>
            <p>${published ? `Published ${menu.publishedSnapshot ? new Date(menu.publishedSnapshot.publishedAt).toLocaleString() : ''}` : 'Not published yet — guests can\'t see this menu.'}</p>
          </div>
          <span class="status-badge status-badge--${published ? 'success' : 'neutral'}">${published ? 'Published' : 'Draft'}</span>
        </div>
        ${unpublished ? `<div class="contrast-warning" style="margin-bottom:1rem">⚠ You have unpublished changes — guests still see the last published version.</div>` : ''}
        <div class="button-row">
          ${canPublish && (!published || unpublished) ? `<button class="btn btn--dark" type="button" id="publishBtn">${published ? 'Publish changes' : 'Publish menu'}</button>` : ''}
          ${canPublish && published ? `<button class="btn btn--ghost" type="button" id="unpublishBtn">Unpublish</button>` : ''}
        </div>
      </div>

      ${
        published
          ? `<div class="dash-qr-grid">
        <div>
          <div class="dash-qr-canvas-wrap">
            <canvas id="qrCanvas"></canvas>
            <div class="button-row">
              ${canManageQr ? `<button class="btn btn--ghost" type="button" id="downloadPngBtn">Download PNG</button><button class="btn btn--ghost" type="button" id="downloadSvgBtn">Download SVG</button>` : ''}
            </div>
          </div>
        </div>
        <div>
          <div class="dash-card" style="margin-bottom:1.25rem">
            <div class="dash-card-header"><div><h2>Live menu link</h2><p>Scan the code or share this link directly.</p></div></div>
            <div class="dash-link-row">
              <input type="text" id="liveUrl" readonly />
              <button class="btn btn--dark" type="button" id="copyLinkBtn">Copy link</button>
            </div>
            <a class="btn btn--ghost" id="openLiveBtn" href="#" target="_blank" rel="noopener" style="margin-top:1rem">Open live menu ↗</a>
          </div>
          ${
            canManageQr
              ? `<div class="dash-card">
            <div class="dash-card-header"><div><h2>QR card styling</h2><p>Customize what prints alongside your code.</p></div></div>
            <div class="dash-checkbox-row" style="margin-bottom:1rem">
              <label><input type="checkbox" id="showLogo" ${cardStyle.showLogo ? 'checked' : ''} /> Show logo</label>
              <label><input type="checkbox" id="showName" ${cardStyle.showName ? 'checked' : ''} /> Show restaurant name</label>
            </div>
            <div class="field" style="margin-bottom:1rem">
              <label for="ctaText">Call to action</label>
              <input id="ctaText" value="${esc(cardStyle.cta)}" placeholder="Scan to view our menu" />
            </div>
            <div class="dash-option-group">
              <span>Preview as</span>
              <div class="segmented" id="variantToggle">
                <button type="button" data-variant="table" class="active">Table card</button>
                <button type="button" data-variant="sticker">Sticker</button>
                <button type="button" data-variant="simple">Simple QR</button>
              </div>
            </div>
            <div id="cardPreviewWrap" style="margin-top:1rem;display:flex;justify-content:center"></div>
          </div>`
              : ''
          }
        </div>
      </div>`
          : `<div class="dash-card"><div class="dash-empty-state"><div class="dash-empty-state-icon">▦</div><h3>Publish to get your QR code</h3><p>Once this menu is published, you'll get a live link and a scannable QR code for your tables.</p></div></div>`
      }`;

    bindEvents(menu, published);
  }

  function bindEvents(menu, published) {
    $('#publishBtn')?.addEventListener('click', () => {
      store.publishMenu(restaurant.id, menuId);
      window.MenuFlowShell.toast('Menu published');
      if (!window.MenuFlowShellCommon.completeGuide({
        title: 'Menu published',
        nextUrl: `publish.html?menu=${encodeURIComponent(menuId)}&stage=qr`,
      })) renderBody();
    });
    $('#unpublishBtn')?.addEventListener('click', () => {
      window.MenuFlowShell.confirmDialog({ title: 'Unpublish this menu?', message: "Guests scanning your QR code won't see it until you publish again.", confirmLabel: 'Unpublish', danger: true }).then(ok => {
        if (!ok) return;
        store.unpublishMenu(restaurant.id, menuId);
        window.MenuFlowShell.toast('Menu unpublished');
        renderBody();
      });
    });

    if (!published) return;

    const url = liveUrl(currentMenu());
    $('#liveUrl').value = url;
    $('#openLiveBtn').href = url;
    window.QRCode.toCanvas($('#qrCanvas'), url, { width: 240, margin: 1, color: { dark: '#000000', light: '#FFFFFF' } }, () => {});

    $('#copyLinkBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(url);
        window.MenuFlowShell.toast('Link copied');
      } catch (error) {
        $('#liveUrl').select();
        window.MenuFlowShell.toast('Select and copy the link above');
      }
    });

    $('#downloadPngBtn')?.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-qr.png`;
      link.href = $('#qrCanvas').toDataURL('image/png');
      link.click();
      window.MenuFlowShell.toast('QR downloaded (PNG)');
      finishQrStep();
    });
    $('#downloadSvgBtn')?.addEventListener('click', () => {
      window.QRCode.toString(url, { type: 'svg', margin: 1, color: { dark: '#000000', light: '#FFFFFF' } }, (error, svg) => {
        if (error) return;
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const link = document.createElement('a');
        link.download = `${restaurant.name.toLowerCase().replace(/\s+/g, '-')}-qr.svg`;
        link.href = URL.createObjectURL(blob);
        link.click();
        window.MenuFlowShell.toast('QR downloaded (SVG)');
        finishQrStep();
      });
    });

    if (canManageQr) {
      $('#showLogo').addEventListener('change', e => { cardStyle.showLogo = e.target.checked; renderCardPreview(); });
      $('#showName').addEventListener('change', e => { cardStyle.showName = e.target.checked; renderCardPreview(); });
      $('#ctaText').addEventListener('input', e => { cardStyle.cta = e.target.value; renderCardPreview(); });
      $$('#variantToggle button').forEach(btn =>
        btn.addEventListener('click', () => {
          $$('#variantToggle button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          cardVariant = btn.dataset.variant;
          renderCardPreview();
        })
      );
      renderCardPreview();
    }
  }

  function finishQrStep() {
    store.updateRestaurantFlags(restaurant.id, { qrVisited: true });
    window.MenuFlowShellCommon.completeGuide({
      title: 'Your launch sequence is complete',
      nextUrl: 'index.html',
      delay: 1000,
    });
  }

  function renderCardPreview() {
    const host = $('#cardPreviewWrap');
    if (!host) return;
    const size = cardVariant === 'simple' ? 120 : cardVariant === 'sticker' ? 100 : 140;
    host.innerHTML = `
      <div class="dash-qr-card-preview" style="${cardVariant === 'sticker' ? 'border-radius:50%;aspect-ratio:1;display:flex;flex-direction:column;justify-content:center' : ''}">
        ${cardStyle.showLogo && cardVariant !== 'simple' ? `<div style="width:2rem;height:2rem;border-radius:50%;border:1px solid rgba(255,255,255,.4);display:grid;place-items:center;margin:0 auto;font-family:var(--mf-font-serif)">${esc(restaurant.name.charAt(0))}</div>` : ''}
        <div id="cardQr" style="margin:.75rem auto 0"></div>
        ${cardStyle.showName && cardVariant !== 'simple' ? `<strong>${esc(restaurant.name)}</strong>` : ''}
        ${cardVariant !== 'simple' ? `<span>${esc(cardStyle.cta)}</span>` : ''}
      </div>`;
    const canvas = document.createElement('canvas');
    $('#cardQr').appendChild(canvas);
    window.QRCode.toCanvas(canvas, liveUrl(currentMenu()), { width: size, margin: 0, color: { dark: '#ffffff', light: '#00000000' } }, () => {});
  }

  init();
})();
