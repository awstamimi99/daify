/**
 * "Feast" — the Modern Visual Food Menu family. A genuinely different
 * renderer from menu-renderer.js (classic family): its own DOM, its own
 * CSS vocabulary, its own item-detail interaction. It consumes the exact
 * same window.MenuFlowMenuData shape as every other family — no template-
 * specific content, so switching a menu between families never touches
 * menu data. See docs/TEMPLATE_ENGINE.md for the family architecture.
 *
 * Interaction hooks shared with the classic family on purpose (so the one
 * template-controller.js can drive both without knowing which family it's
 * looking at): [data-menu-search], [data-menu-item], [data-search],
 * [data-menu-section], [data-section-link]. This one adds a second,
 * optional contract — [data-item-sheet] + [data-menu-item][data-detail-*]
 * — for the tap-to-open dish detail sheet.
 */
(function () {
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const tagAr = {'Vegetarian':'نباتي','Vegan':'نباتي صرف','Gluten Free':'خالٍ من الغلوتين','Chef\'s Choice':'اختيار الشيف','House Favorite':'مفضل لدينا','New':'جديد','Best Seller':'الأكثر طلباً','Signature':'طبق مميز','House Made':'محضر لدينا'};

  function itemCard(item, lang, rtl) {
    const tr = item.translations?.[lang] || {};
    const name = tr.name || item.name;
    const description = tr.description || item.description;
    const unavailableLabel = rtl ? 'غير متوفر' : 'Unavailable';
    const media = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(name)}" width="600" height="600" loading="lazy">`
      : `<div class="feast-card-media-placeholder" aria-hidden="true">${esc((name || '?').trim().charAt(0))}</div>`;
    const flag = item.available ? '' : `<span class="feast-sold-out">${unavailableLabel}</span>`;
    const badgeLabel = item.badge ? esc(rtl ? (tagAr[item.badge] || item.badge) : item.badge) : '';
    const badge = item.badge ? `<span class="feast-badge">${badgeLabel}</span>` : '';
    const dietaryList = (item.dietary || []).map(d => rtl ? (tagAr[d] || d) : d);
    return `<button type="button" class="feast-card${item.featured ? ' is-featured' : ''}${item.available ? '' : ' is-unavailable'}"
        data-menu-item data-detail-id="${esc(item.id)}"
        data-detail-name="${esc(name)}" data-detail-desc="${esc(description)}" data-detail-price="${esc(item.price)}"
        data-detail-image="${item.image ? esc(item.image) : ''}" data-detail-badge="${badgeLabel}"
        data-detail-dietary="${esc(dietaryList.join(','))}" data-detail-available="${item.available !== false}"
        data-search="${esc(`${item.name} ${item.description} ${name} ${description}`.toLowerCase())}">
      <figure class="feast-card-media">${media}${flag}${badge}</figure>
      <div class="feast-card-body">
        <h3>${esc(name)}</h3>
        <p>${esc(description)}</p>
        <strong class="feast-card-price"><bdi>${esc(item.price)}</bdi></strong>
      </div>
    </button>`;
  }

  function sectionMarkup(section, lang, rtl) {
    const heading = esc(rtl ? section.nameAr : section.name);
    const items = section.items || [];
    const body = items.length
      ? `<div class="feast-grid">${items.map(item => itemCard(item, lang, rtl)).join('')}</div>`
      : `<p class="feast-empty-section">${rtl ? 'لا توجد أطباق في هذا القسم بعد.' : 'No dishes in this category yet.'}</p>`;
    return `<section class="feast-section" id="${esc(section.id)}" data-menu-section>
      <h2 class="feast-section-heading">${heading}</h2>
      ${body}
    </section>`;
  }

  function renderMenu(root, data, options = {}) {
    if (!root || !data) return;
    const lang = options.lang || 'en';
    const rtl = lang === 'ar';
    const r = data.restaurant;
    const rt = r.translations?.[lang] || {};
    const layout = data.layout || {};
    const heroImage = layout.hero?.image || r.coverImage || '';
    const sections = data.sections || [];
    document.documentElement.lang = lang;
    document.documentElement.dir = rtl ? 'rtl' : 'ltr';

    root.innerHTML = `<div class="feast-menu restaurant-menu" data-template="feast">
      <header class="feast-header">
        <div class="feast-header-media">${heroImage ? `<img src="${esc(heroImage)}" alt="${esc(rt.name || r.name)}" width="1200" height="700">` : ''}</div>
        <div class="feast-header-overlay">
          <div class="feast-header-brand">
            <span class="feast-monogram" aria-hidden="true">${esc(r.logoText)}</span>
            <div><strong>${esc(rt.name || r.name)}</strong><span>${esc(rt.type || r.type)}</span></div>
          </div>
          <div class="feast-header-status"><span></span>${esc(rt.openingStatus || r.openingStatus)}</div>
        </div>
      </header>
      <div class="feast-tools-wrap">
        <label class="feast-search">
          <span aria-hidden="true">⌕</span><span class="sr-only">${rtl ? 'البحث في القائمة' : 'Search menu'}</span>
          <input type="search" placeholder="${rtl ? 'ابحث عن طبق...' : 'Search dishes...'}" data-menu-search>
        </label>
        <nav class="feast-category-bar" aria-label="${rtl ? 'أقسام القائمة' : 'Menu categories'}">
          ${sections.map(s => `<a href="#${esc(s.id)}" data-section-link="${esc(s.id)}">${esc(rtl ? s.nameAr : s.name)}</a>`).join('')}
        </nav>
      </div>
      <main class="feast-content">
        ${sections.map(section => sectionMarkup(section, lang, rtl)).join('')}
        <div class="menu-empty feast-empty" hidden>${rtl ? 'لا توجد أطباق مطابقة لبحثك.' : 'No dishes match your search.'}</div>
      </main>
      <footer class="feast-footer">
        <div class="feast-footer-brand"><span aria-hidden="true">${esc(r.logoText)}</span><strong>${esc(rt.name || r.name)}</strong></div>
        <div class="feast-footer-info">
          <p>⌖ ${esc(rt.address || r.address)}</p>
          <a href="tel:${esc(r.phone.replace(/\s/g, ''))}"><bdi>${esc(r.phone)}</bdi></a>
          ${(r.hours || []).map(h => `<p>${esc(rtl ? h.daysAr : h.days)} · ${esc(rtl ? h.timeAr : h.time)}</p>`).join('')}
        </div>
        <p class="feast-footer-credit">${rtl ? 'قائمة بواسطة' : 'Menu by'} <a href="../index.html">DAIFY</a> · © 2026 ${esc(rt.name || r.name)}</p>
      </footer>
      <dialog class="feast-sheet" data-item-sheet aria-label="${rtl ? 'تفاصيل الطبق' : 'Dish details'}">
        <button type="button" class="feast-sheet-close" data-sheet-close aria-label="${rtl ? 'إغلاق' : 'Close'}">✕</button>
        <figure class="feast-sheet-media" data-sheet-media></figure>
        <div class="feast-sheet-body">
          <h3 data-sheet-name></h3>
          <div class="feast-sheet-tags" data-sheet-tags></div>
          <p data-sheet-desc></p>
          <strong class="feast-sheet-price" data-sheet-price></strong>
        </div>
      </dialog>
    </div>`;
    document.title = `${rt.name || r.name} — ${options.name || 'Menu'}`;
  }

  window.MenuFlowRendererRegistry = window.MenuFlowRendererRegistry || {};
  window.MenuFlowRendererRegistry.feast = { render: renderMenu, escape: esc };
})();
