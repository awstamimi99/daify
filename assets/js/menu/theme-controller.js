(function () {
  const tokenMap = {
    background:'--restaurant-bg', surface:'--restaurant-surface', primary:'--restaurant-primary',
    accent:'--restaurant-accent', text:'--restaurant-text', muted:'--restaurant-muted',
    cardRadius:'--restaurant-radius-card', buttonRadius:'--restaurant-radius-button',
    gridColumns:'--restaurant-grid-columns'
  };
  function applyTheme(theme, target = document.documentElement) {
    Object.entries(theme || {}).forEach(([key,value]) => {
      if (tokenMap[key] && value != null) target.style.setProperty(tokenMap[key], value);
    });
    const shell = document.querySelector('.restaurant-menu');
    if (!shell) return;
    ['itemLayout','sectionNav','cardStyle','imageStyle'].forEach(key => {
      if (theme[key]) shell.dataset[key] = theme[key];
    });
  }
  window.MenuFlowTheme = { apply: applyTheme, tokenMap };
})();
