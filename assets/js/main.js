(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  if (window.AOS) {
    AOS.init({
      duration: 700,
      easing: 'ease-out-cubic',
      once: true,
      offset: 60,
      disable: () => matchMedia('(prefers-reduced-motion: reduce)').matches,
    });
  }

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
      mobileFooter.innerHTML = '<span class="mobile-menu-label">Let\'s talk</span><a class="mobile-menu-contact" href="contact.html">Contact DAIFY ↗</a><div class="mobile-menu-actions"><a class="btn btn--light" href="signup.html">Start Free Trial</a><a class="btn btn--ghost" href="login.html">Log In</a></div>';
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

  $$('.faq-question').forEach(btn => btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item'); const open = item.classList.toggle('open');
    btn.setAttribute('aria-expanded', open); $('span:last-child', btn).textContent = open ? '−' : '+';
  }));

  const homeJourneySteps = $$('.home-journey-step');
  const homeJourneyStage = $('.home-journey-stage');
  if (homeJourneySteps.length && homeJourneyStage) {
    const journeyCount = $('header b', homeJourneyStage);
    const journeyCard = $('.home-journey-card', homeJourneyStage);
    const journeyLabel = $('.home-journey-card > span', homeJourneyStage);
    const journeyTitle = $('.home-journey-card h3', homeJourneyStage);
    const journeyCopy = $('.home-journey-card p', homeJourneyStage);
    const journeyBars = $$('.home-journey-progress i', homeJourneyStage);
    const activateJourney = (button, index) => {
      homeJourneySteps.forEach(step => {
        const active = step === button;
        step.classList.toggle('active', active);
        step.setAttribute('aria-pressed', String(active));
      });
      if (journeyCount) journeyCount.textContent = String(index + 1).padStart(2, '0');
      if (journeyLabel) journeyLabel.textContent = `STEP ${String(index + 1).padStart(2, '0')}`;
      if (journeyTitle) journeyTitle.textContent = button.dataset.title;
      if (journeyCopy) journeyCopy.textContent = button.dataset.copy;
      journeyBars.forEach((bar, barIndex) => bar.classList.toggle('active', barIndex <= index));
      if (journeyCard) {
        journeyCard.classList.remove('changing');
        requestAnimationFrame(() => journeyCard.classList.add('changing'));
      }
    };
    homeJourneySteps.forEach((button, index) => {
      button.addEventListener('click', () => activateJourney(button, index));
      button.addEventListener('mouseenter', () => activateJourney(button, index));
      button.addEventListener('focus', () => activateJourney(button, index));
    });
  }

  const demo = $('.demo-screen');
  const demoStatus = $('#demoStatus');
  const demoSelections = { color: 'Red', radius: 'Rounded', card: 'Flat', layout: 'List', image: 'Rounded', nav: 'Chips' };
  const updateDemoStatus = () => {
    if (demoStatus) demoStatus.textContent = `${demoSelections.color} · ${demoSelections.radius} · ${demoSelections.card} · ${demoSelections.layout} · ${demoSelections.image} images · ${demoSelections.nav} nav`;
  };
  $$('[data-demo]').forEach(btn => btn.addEventListener('click', () => {
    const group = btn.closest('.control-group');
    $$('button', group).forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    const [kind, value] = btn.dataset.demo.split(':');
    if (kind === 'radius') { demo?.style.setProperty('--demo-radius', value); demo?.style.setProperty('--demo-card-radius', value === '0' ? '0' : value === '999px' ? '1.4rem' : value); }
    if (kind === 'card') { demo?.style.setProperty('--demo-shadow', value === 'elevated' ? '0 10px 24px rgba(0,0,0,.1)' : 'none'); demo?.style.setProperty('--demo-border', value === 'bordered' ? '1px solid rgba(0,0,0,.16)' : '0'); }
    if (kind === 'layout') { const items = $('.demo-items'); items.className = `demo-items ${value}`; }
    if (kind === 'image') { demo?.style.setProperty('--demo-image-radius', value); }
    if (kind === 'nav') { const nav = $('.demo-nav'); if (nav) nav.className = `demo-nav${value === 'chips' ? '' : ' ' + value}`; }
    demoSelections[kind] = btn.textContent.trim().replace(/\b\w/g, letter => letter.toUpperCase());
    updateDemoStatus();
  }));
  $$('.swatch').forEach(btn => btn.addEventListener('click', () => {
    $$('.swatch').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    demo?.style.setProperty('--demo-accent', btn.dataset.color);
    demoSelections.color = ({ '#e53935': 'Red', '#587ff8': 'Blue', '#238a57': 'Green', '#d98713': 'Amber' })[btn.dataset.color] || 'Custom';
    updateDemoStatus();
  }));

  const templateShell = $('.templates-shell');
  const templateTabs = $$('.template-tab', templateShell || document);
  const templateScrollMode = matchMedia('(min-width: 1101px) and (min-height: 820px) and (prefers-reduced-motion: no-preference)');
  let activeTemplateIndex = 0;
  let templateScrollFrame = 0;

  // Mini-menu content for each tab shown in the hero device deck. Only 3
  // phones are ever on screen at once (the fan layout), so whichever
  // template is active always renders center-stage, flanked by its two
  // neighbors in the tab order — never a mismatched card.
  const DECK_CONTENT = {
    Atelier: { theme: '', cover: false, meta: 'A seasonal tasting room', tabs: ['Menu', 'Wine'], dishes: [['Garden pea velouté', '12'], ['Roasted turbot', '28'], ['Vanilla fig', '11']] },
    Verde: { theme: 'theme-verde', cover: false, meta: 'Fresh, all day', tabs: ['Bowls', 'Juice'], dishes: [['Citrus grain bowl', '6'], ['Avocado toast', '5'], ['Green press', '4']] },
    Noir: { theme: 'theme-noir', cover: true, meta: 'After dark dining', tabs: ['Small plates', 'Fire'], dishes: [['Smoked aubergine', '6'], ['Coal roasted lamb', '17']] },
    Sora: { theme: 'theme-sora', cover: false, meta: 'Quiet, precise plates', tabs: ['Nigiri', 'Mains'], dishes: [['Salmon nigiri', '9'], ['Miso black cod', '16']] },
    Amalfi: { theme: 'theme-amalfi', cover: false, meta: 'Coastal kitchen', tabs: ['Antipasti', 'Pasta'], dishes: [['Burrata & peach', '7'], ['Lemon linguine', '9']] },
  };
  const deckCards = templateShell ? $$('.device-card', templateShell) : [];

  const renderDeckCard = (card, name, muted) => {
    const data = DECK_CONTENT[name];
    if (!data) return;
    card.className = `device-card${muted ? ' muted' : ''}${data.theme ? ' ' + data.theme : ''}`;
    card.querySelector('.mini-menu').innerHTML = `
      ${data.cover ? '<div class="menu-cover"></div>' : ''}
      <span class="mini-meta">${data.meta}</span>
      <h3 class="mini-brand">${name}</h3>
      <div class="mini-tabs">${data.tabs.map(t => `<span>${t}</span>`).join('')}</div>
      ${data.dishes.map(([dish, price]) => `<article class="dish"><strong>${dish}</strong><b>${price}</b></article>`).join('')}
    `;
  };

  const activateTemplate = index => {
    if (!templateTabs.length) return;
    const nextIndex = Math.max(0, Math.min(templateTabs.length - 1, index));
    const button = templateTabs[nextIndex];
    activeTemplateIndex = nextIndex;
    templateTabs.forEach(tab => tab.classList.remove('active'));
    button.classList.add('active');
    const data = window.MenuFlowTemplates?.find(template => template.name === button.textContent.trim());
    if (data) { $('#templateName').textContent = data.name; $('#templateTone').textContent = data.tone; $('#templateType').textContent = data.type; }
    if (deckCards.length === 3) {
      const count = templateTabs.length;
      const prevName = templateTabs[(nextIndex - 1 + count) % count].textContent.trim();
      const activeName = button.textContent.trim();
      const nextName = templateTabs[(nextIndex + 1) % count].textContent.trim();
      renderDeckCard(deckCards[0], prevName, true);
      renderDeckCard(deckCards[1], activeName, false);
      renderDeckCard(deckCards[2], nextName, true);
    }
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
    activateTemplate(0);
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
      <article class="template-card" data-type="${t.type}" style="--card-bg:${t.bg};--card-accent:${t.accent}" data-aos="fade-up" data-aos-delay="${(i % 3) * 80}">
        <a class="template-preview" href="template-preview.html?template=${t.slug}" aria-label="Preview ${t.name} template">
          <img class="template-cover" src="assets/images/template-covers-v2/${t.slug}.png" alt="${t.name} restaurant atmosphere" loading="lazy" onerror="this.src='assets/images/template-previews/${t.slug}.jpg'">
          <span class="template-preview-tag"><i></i>${t.type}</span>
          <span class="template-preview-play" aria-hidden="true"><i>↗</i><b>View live</b></span>
          <span class="template-preview-shade" aria-hidden="true"></span>
          <span class="template-preview-name" aria-hidden="true"><small>DAIFY TEMPLATE</small><b>${t.name}</b></span>
        </a>
        <div class="template-info">
          <div class="template-card-heading"><div><small>${String(i + 1).padStart(2, '0')} / 09</small><h3>${t.name}</h3></div><i aria-hidden="true"></i></div>
          <p>${t.tone}</p>
          <div class="template-actions"><a class="btn template-action-preview" href="template-preview.html?template=${t.slug}">Preview <span>↗</span></a><a class="btn template-action-customize" href="template-customizer.html?template=${t.slug}">Customize <span>＋</span></a></div>
        </div>
      </article>`).join(''); window.AOS?.refreshHard(); };
    render('All');
    $$('.filter-btn').forEach(btn => btn.addEventListener('click', () => { $$('.filter-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); render(btn.dataset.filter); }));
  }
  $$('.modal-close,[data-close-modal]').forEach(btn => btn.addEventListener('click', () => $('.modal')?.classList.remove('open')));

  $$('form[data-prototype="contact"]').forEach(form => form.addEventListener('submit', e => {
    e.preventDefault(); const message = $('.form-message', form); if (!form.checkValidity()) { form.reportValidity(); return; }
    message.textContent = 'Thanks — your message is ready. Form delivery will be connected in the Drupal phase.';
    message.classList.add('show', 'form-message--success');
  }));
  $$('.password-toggle').forEach(btn => btn.addEventListener('click', () => { const input = btn.previousElementSibling; input.type = input.type === 'password' ? 'text' : 'password'; btn.textContent = input.type === 'password' ? 'Show' : 'Hide'; }));
})();
