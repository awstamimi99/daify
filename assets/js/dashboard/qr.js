(function () {
  const $ = s => document.querySelector(s);

  function liveUrl() {
    const state = window.MenuFlowStore.getState();
    const theme = state.theme || {};
    const params = new URLSearchParams();
    if (Object.keys(theme).length) params.set('theme', JSON.stringify(theme));
    const query = params.toString();
    return `${location.origin}/templates/${state.selectedTemplate || 'atelier'}.html${query ? '?' + query : ''}`;
  }

  function render() {
    const url = liveUrl();
    $('#liveUrl').value = url;
    $('#openLiveBtn').href = url;

    window.QRCode.toCanvas($('#qrCanvas'), url, { width: 260, margin: 1, color: { dark: '#171A17', light: '#FFFFFF' } }, error => {
      if (error) console.error(error);
    });

    window.MenuFlowStore.setState(s => ({ ...s, meta: Object.assign({}, s.meta, { visitedQr: true }) }));
  }

  function bindActions() {
    $('#copyLinkBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText($('#liveUrl').value);
        window.MenuFlowDashShell.showToast('Link copied');
      } catch (error) {
        $('#liveUrl').select();
        window.MenuFlowDashShell.showToast('Select and copy the link above');
      }
    });

    $('#downloadQrBtn').addEventListener('click', () => {
      const canvas = $('#qrCanvas');
      const state = window.MenuFlowStore.getState();
      const link = document.createElement('a');
      link.download = `${(state.restaurant.name || 'menuflow').toLowerCase().replace(/\s+/g, '-')}-qr.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      window.MenuFlowDashShell.showToast('QR downloaded');
    });
  }

  function init() {
    render();
    bindActions();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
