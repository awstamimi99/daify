(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const header = $('.site-header');
  const navToggle = $('.nav-toggle');
  const navLinks = $('.nav-links');
  const mobileMenuQuery = matchMedia('(max-width: 980px)');
  let menuBackdrop;

  if (navToggle && navLinks) {
    navToggle.innerHTML = '<span></span><span></span>';
    navToggle.setAttribute('aria-controls', 'mobile-menu');
    navToggle.setAttribute('aria-expanded', 'false');
    navLinks.id = 'mobile-menu';
  }

  const closeMenu = () => {
    navLinks?.classList.remove('open');
    document.body.classList.remove('menu-open');
    navToggle?.setAttribute('aria-expanded', 'false');
    const mobileFooter = navLinks?.querySelector('.mobile-menu-footer');
    if (mobileFooter) {
      mobileFooter.hidden = true;
      mobileFooter.setAttribute('aria-hidden', 'true');
    }
    if (menuBackdrop) menuBackdrop.hidden = true;
  };

  const syncMobileMenu = () => {
    if (!navToggle || !navLinks) return;

    if (!mobileMenuQuery.matches) {
      closeMenu();
      navLinks.querySelector('.mobile-menu-footer')?.remove();
      menuBackdrop?.remove();
      menuBackdrop = undefined;
      return;
    }

    if (!navLinks.querySelector('.mobile-menu-footer')) {
      const mobileFooter = document.createElement('div');
      mobileFooter.className = 'mobile-menu-footer';
      mobileFooter.hidden = true;
      mobileFooter.setAttribute('aria-hidden', 'true');
      mobileFooter.innerHTML = '<span class="mobile-menu-label">Let\'s talk</span><a class="mobile-menu-contact" href="contact.html">Contact MenuFlow ↗</a><div class="mobile-menu-actions"><a class="btn btn--light" href="signup.html">Start Free Trial</a><a class="btn btn--ghost" href="login.html">Log In</a></div>';
      navLinks.appendChild(mobileFooter);
    }

    if (!menuBackdrop) {
      menuBackdrop = document.createElement('button');
      menuBackdrop.className = 'menu-backdrop';
      menuBackdrop.type = 'button';
      menuBackdrop.hidden = true;
      menuBackdrop.setAttribute('aria-label', 'Close navigation menu');
      menuBackdrop.addEventListener('click', closeMenu);
      document.body.appendChild(menuBackdrop);
    }
  };

  syncMobileMenu();
  mobileMenuQuery.addEventListener?.('change', syncMobileMenu);

  const onScroll = () => header?.classList.toggle('scrolled', scrollY > 24);
  onScroll(); addEventListener('scroll', onScroll, {passive:true});
  navToggle?.addEventListener('click', () => {
    syncMobileMenu();
    const open = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', open);
    document.body.classList.toggle('menu-open', open);
    const mobileFooter = navLinks.querySelector('.mobile-menu-footer');
    if (mobileFooter) {
      mobileFooter.hidden = !open;
      mobileFooter.setAttribute('aria-hidden', String(!open));
    }
    if (menuBackdrop) menuBackdrop.hidden = !open;
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });

  const observer = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); }
  }), {threshold:.12});
  $$('.fade-up').forEach(el => observer.observe(el));

  $$('.faq-question').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item'); const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open); $('span:last-child', btn).textContent = open ? '−' : '+';
  }));

  const demo = $('.demo-screen');
  $$('[data-demo]').forEach(btn => btn.addEventListener('click', () => {
    const group = btn.closest('.control-group'); $$('button', group).forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const [kind, value] = btn.dataset.demo.split(':');
    if (kind === 'radius') { demo?.style.setProperty('--demo-radius', value); demo?.style.setProperty('--demo-card-radius', value === '0' ? '0' : value === '999px' ? '1.4rem' : value); }
    if (kind === 'card') { demo?.style.setProperty('--demo-shadow', value === 'elevated' ? '0 10px 24px rgba(0,0,0,.1)' : 'none'); demo?.style.setProperty('--demo-border', value === 'bordered' ? '1px solid rgba(0,0,0,.16)' : '0'); }
    if (kind === 'layout') { const items = $('.demo-items'); items.className = `demo-items ${value}`; }
  }));
  $$('.swatch').forEach(btn => btn.addEventListener('click', () => {
    $$('.swatch').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    demo?.style.setProperty('--demo-accent', btn.dataset.color);
  }));

  const templateShell = $('.templates-shell');
  const templateTabs = $$('.template-tab', templateShell || document);
  const templateScrollMode = matchMedia('(min-width: 1101px) and (min-height: 820px) and (prefers-reduced-motion: no-preference)');
  let activeTemplateIndex = 0;
  let templateScrollFrame = 0;

  const activateTemplate = index => {
    if (!templateTabs.length) return;
    const nextIndex = Math.max(0, Math.min(templateTabs.length - 1, index));
    const button = templateTabs[nextIndex];
    activeTemplateIndex = nextIndex;
    templateTabs.forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    const data = window.MenuFlowTemplates?.find(template => template.name === button.textContent.trim());
    if (data) { $('#templateName').textContent = data.name; $('#templateTone').textContent = data.tone; $('#templateType').textContent = data.type; }
    $$('.device-card', templateShell).forEach((card, cardIndex) => card.classList.toggle('muted', cardIndex !== nextIndex % 3));
  };

  const syncTemplateScroll = () => {
    templateScrollFrame = 0;
    if (!templateShell || !templateScrollMode.matches || templateTabs.length < 2) return;
    const scrollDistance = Math.max(1, templateShell.offsetHeight - innerHeight);
    const progress = Math.max(0, Math.min(1, -templateShell.getBoundingClientRect().top / scrollDistance));
    const nextIndex = Math.round(progress * (templateTabs.length - 1));
    if (nextIndex !== activeTemplateIndex) activateTemplate(nextIndex);
  };

  const scheduleTemplateScroll = () => {
    if (!templateScrollFrame) templateScrollFrame = requestAnimationFrame(syncTemplateScroll);
  };

  const syncTemplateMode = () => {
    templateShell?.classList.toggle('is-scroll-tabs', templateScrollMode.matches);
    scheduleTemplateScroll();
  };

  templateTabs.forEach((button, index) => button.addEventListener('click', () => activateTemplate(index)));
  if (templateTabs.length) {
    syncTemplateMode();
    addEventListener('scroll', scheduleTemplateScroll, {passive:true});
    addEventListener('resize', scheduleTemplateScroll, {passive:true});
    templateScrollMode.addEventListener?.('change', syncTemplateMode);
  }

  $$('.billing-toggle button').forEach(btn => btn.addEventListener('click', () => {
    $$('.billing-toggle button').forEach(b => b.classList.remove('active')); btn.classList.add('active');
    const yearly = btn.dataset.billing === 'yearly';
    $$('[data-monthly]').forEach(el => el.textContent = yearly ? el.dataset.yearly : el.dataset.monthly);
    $('.billing-note') && ($('.billing-note').textContent = yearly ? 'Billed yearly — two months included' : 'Billed monthly');
  }));

  const templateGrid = $('#templateGrid');
  if (templateGrid && window.MenuFlowTemplates) {
    const render = filter => { templateGrid.innerHTML = window.MenuFlowTemplates.filter(t => filter === 'All' || t.type === filter).map((t,i) => `
      <article class="template-card" data-type="${t.type}">
        <a class="template-preview" href="templates/${t.slug}.html?preview=1" style="--card-bg:${t.bg};--mini-bg:${t.mini};--card-accent:${t.accent};--preview-image:url('../images/template-previews/${t.slug}.jpg')" aria-label="Preview ${t.name} template">
          <span class="template-device"><img src="assets/images/template-previews/${t.slug}.jpg" alt="${t.name} restaurant menu preview" width="390" height="2200" loading="lazy"></span>
          <span class="template-preview-label"><small>${t.type}</small><strong>${t.name}</strong></span>
        </a><div class="template-info"><h3>${t.name}</h3><span>${t.type} · ${t.tone}</span><div class="template-actions"><a href="templates/${t.slug}.html?preview=1">Preview Template</a><a href="template-customizer.html?template=${t.slug}">Customize Demo</a></div></div>
      </article>`).join(''); };
    render('All');
    $$('.filter-btn').forEach(btn => btn.addEventListener('click', () => { $$('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.filter); }));
  }
  $$('.modal-close,[data-close-modal]').forEach(btn => btn.addEventListener('click', () => $('.modal')?.classList.remove('open')));

  $$('form[data-prototype]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault(); const message = $('.form-message', form); if (!form.checkValidity()) { form.reportValidity(); return; }
    if (form.dataset.prototype === 'signup') { const p = $('[name="password"]', form), c = $('[name="confirmPassword"]', form); if (p.value.length < 8 || p.value !== c.value) { message.textContent = 'Use at least 8 characters and make sure both passwords match.'; message.classList.add('show'); return; } }
    message.textContent = form.dataset.prototype === 'contact' ? 'Thanks — your message is ready. Form delivery will be connected in the Drupal phase.' : 'Your trial signup is ready. Account activation will be connected in the Drupal phase.';
    message.classList.add('show');
  }));
  $$('.password-toggle').forEach(btn => btn.addEventListener('click', () => { const input = btn.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; btn.textContent = input.type === 'password' ? 'Show' : 'Hide'; }));
})();
