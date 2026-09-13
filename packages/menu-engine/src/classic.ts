// Typed port of the preserved classic renderer; markup and CSS hooks stay compatible.
import type { RenderItem, RenderModel, RenderOptions, RenderBlock } from './render-model';
import { escapeHtml as esc } from './render-model';
import { isRtl } from './index';

  const tagAr: Record<string, string> = {'Vegetarian':'نباتي','Vegan':'نباتي صرف','Gluten Free':'خالٍ من الغلوتين','Chef\'s Choice':'اختيار الشيف','House Favorite':'مفضل لدينا','New':'جديد','Best Seller':'الأكثر طلباً','Signature':'طبق مميز','House Made':'محضر لدينا'};
  const DEFAULT_BLOCKS: RenderBlock[] = [{ type: 'featured', visible: true }, { type: 'menu', visible: true }];

  function itemMarkup(item: RenderItem, lang: string) {
    const tr = item.translations?.[lang] || {};
    const name = tr.name || item.name;
    const description = tr.description || item.description;
    const tags = [...item.dietary];
    if (item.badge) tags.unshift(item.badge);
    const unavailableLabel = lang === 'ar' ? 'غير متوفر' : 'Unavailable';
    const media = item.image
      ? `<img src="${esc(item.image)}" alt="${esc(item.imageAlt || name)}" width="900" height="900" loading="lazy">`
      : `<div class="menu-item-media-placeholder" aria-hidden="true">${esc(name.trim().charAt(0))}</div>`;
    const flag = item.available ? '' : `<span class="sold-out-flag">${unavailableLabel}</span>`;
    return `<article class="menu-item${item.featured ? ' is-featured' : ''}${item.available ? '' : ' is-unavailable'}" data-menu-item data-search="${esc(`${item.name} ${item.description} ${name} ${description}`.toLowerCase())}">
      <figure class="menu-item-media">${media}${flag}</figure>
      <div class="menu-item-content">
        <div class="menu-item-line"><h3>${esc(name)}</h3><strong class="menu-price"><bdi>${esc(item.price)}</bdi></strong></div>
        <p>${esc(description)}</p>${item.allergens ? `<p class="menu-item-allergens">${esc(item.allergens)}</p>` : ''}
        <div class="menu-item-tags">${tags.slice(0,3).map((tag,index) => `<span class="${index === 0 && item.badge ? 'is-badge' : ''}">${esc(lang === 'ar' ? (tagAr[tag] || tag) : tag)}</span>`).join('')}${item.available ? '' : `<span class="availability">${unavailableLabel}</span>`}</div>
      </div>
    </article>`;
  }

  function featuredMarkup(item: RenderItem, lang: string, index: number) {
    const tr = item.translations?.[lang] || {};
    const name = tr.name || item.name;
    const description = tr.description || item.description;
    return `<article class="featured-card" style="--featured-index:${index}">
      <figure><img src="${esc(item.image)}" alt="${esc(item.imageAlt || name)}" width="1200" height="900" loading="${index < 2 ? 'eager' : 'lazy'}"></figure>
      <div class="featured-card-copy">
        <span>${String(index + 1).padStart(2,'0')}</span>
        <div><h3>${esc(name)}</h3><p>${esc(description)}</p>${item.allergens ? `<p class="menu-item-allergens">${esc(item.allergens)}</p>` : ''}</div>
        <strong><bdi>${esc(item.price)}</bdi></strong>
      </div>
    </article>`;
  }

  function renderFeaturedBlock(data: RenderModel, block: RenderBlock, lang: string, rtl: boolean) {
    const featured = data.sections.flatMap(section => section.items).filter(item => item.featured && item.image);
    if (!featured.length) return '';
    return `<section class="menu-featured" aria-labelledby="featured-title">
      <header><div><span>${esc(rtl ? (block.kickerAr || 'اختياراتنا') : (block.kicker || 'Our selections'))}</span><h2 id="featured-title">${esc(rtl ? (block.headingAr || 'أطباق ننصح بها') : (block.heading || 'Made to be remembered.'))}</h2></div><p>${esc(rtl ? (block.subheadingAr || 'أطباق موسمية مفضلة من مطبخنا.') : (block.subheading || 'Seasonal favorites, selected by our kitchen.'))}</p></header>
      <div class="featured-track">${featured.map((entry,index) => featuredMarkup(entry, lang, index)).join('')}</div>
    </section>`;
  }

  function renderMenuBlock(data: RenderModel, block: RenderBlock, lang: string, rtl: boolean) {
    return `<div class="menu-tools-wrap">
        <nav class="section-nav" aria-label="${rtl ? 'أقسام القائمة' : 'Menu sections'}">
          ${data.sections.map(section => `<a href="#${esc(section.id)}" data-section-link="${esc(section.id)}">${esc(rtl ? section.nameAr : section.name)}</a>`).join('')}
        </nav>
        <label class="menu-search"><span aria-hidden="true">⌕</span><span class="sr-only">${rtl ? 'البحث في القائمة' : 'Search menu'}</span><input type="search" placeholder="${rtl ? 'ابحث عن طبق...' : 'Search dishes...'}" data-menu-search></label>
      </div>
      <main class="menu-content">
        ${data.sections.map(section => `<section class="menu-section" id="${esc(section.id)}" data-menu-section>
          <header class="menu-section-heading"><div><span>${String(section.order).padStart(2,'0')}</span><h2>${esc(rtl ? section.nameAr : section.name)}</h2></div><p>${esc(rtl ? section.descriptionAr : section.description)}</p></header>
          <div class="menu-items">${section.items.map(entry => itemMarkup(entry, lang)).join('')}</div>
        </section>`).join('')}
        <div class="menu-empty" hidden>${rtl ? 'لا توجد أطباق مطابقة لبحثك.' : 'No dishes match your search.'}</div>
      </main>`;
  }

  function renderStoryBlock(data: RenderModel, block: RenderBlock, lang: string, rtl: boolean) {
    const heading = rtl ? (block.headingAr || block.heading || '') : (block.heading || '');
    const body = rtl ? (block.bodyAr || block.body || '') : (block.body || '');
    if (!heading && !body && !block.image) return '';
    const position = block.imagePosition === 'right' ? 'right' : 'left';
    return `<section class="menu-story${block.image ? '' : ' no-media'}" data-image-position="${position}">
      ${block.image ? `<figure class="menu-story-media"><img src="${esc(block.image)}" alt="" loading="lazy"></figure>` : ''}
      <div class="menu-story-copy">
        ${heading ? `<h2>${esc(heading)}</h2>` : ''}
        ${body ? `<p>${esc(body)}</p>` : ''}
      </div>
    </section>`;
  }

  function renderGalleryBlock(data: RenderModel, block: RenderBlock, lang: string, rtl: boolean) {
    const images = (block.images || []).filter(Boolean);
    if (!images.length) return '';
    const heading = rtl ? (block.headingAr || block.heading || '') : (block.heading || '');
    return `<section class="menu-gallery">
      ${heading ? `<header><h2>${esc(heading)}</h2></header>` : ''}
      <div class="menu-gallery-grid" data-columns="${Number(block.columns) || 3}">
        ${images.map(src => `<figure><img src="${esc(src)}" alt="" loading="lazy"></figure>`).join('')}
      </div>
    </section>`;
  }

  const BLOCK_RENDERERS = { featured: renderFeaturedBlock, menu: renderMenuBlock, story: renderStoryBlock, gallery: renderGalleryBlock };

  export function renderClassic(data: RenderModel, options: RenderOptions = {}): string {
    const lang = options.lang || 'en';
    const rtl = isRtl(lang);
    const r = data.restaurant;
    const rt = r.translations?.[lang] || {};
    const layout = data.layout || {};
    const blocks = layout.blocks && layout.blocks.length ? layout.blocks : DEFAULT_BLOCKS;
    const heroImage = layout.hero?.image || options.previewCoverImage || r.coverImage;
    const footerImage = layout.footer?.image || r.footerImage || r.coverImage;
    const firstSection = data.sections[0]?.id || 'menu';
    const bodyHtml = blocks
      .filter(block => block.visible !== false)
      .map((block, index) => (BLOCK_RENDERERS[block.type] || (() => ''))(data, block, lang, rtl).replace('aria-labelledby="featured-title"', `aria-labelledby="featured-title-${index}"`).replace('id="featured-title"', `id="featured-title-${index}"`))
      .join('');
    return `<div class="restaurant-menu" data-template="${esc(options.template)}">
      <header class="restaurant-hero">
        <div class="restaurant-cover">${heroImage ? `<img src="${esc(heroImage)}" alt="" width="1536" height="1024">` : ''}</div>
        <div class="restaurant-intro">
          <div class="restaurant-brand-row"><div class="restaurant-monogram" aria-hidden="true">${esc(r.logoText)}</div>${r.establishedYear ? `<span>${rtl ? 'منذ ' : 'EST. '}${esc(new Intl.NumberFormat(lang, { useGrouping: false }).format(r.establishedYear))}</span>` : ''}</div>
          <p class="restaurant-kicker">${esc(rt.type || r.type)}</p>
          <h1>${esc(rt.name || r.name)}</h1>
          <p class="restaurant-description">${esc(rt.description || r.description)}</p>
          <div class="restaurant-status"><span></span>${esc(rt.openingStatus || r.openingStatus)}</div>
          <div class="restaurant-actions"><a class="restaurant-primary-action" href="#${esc(firstSection)}">${rtl ? 'عرض القائمة' : 'Explore the menu'} <span>↓</span></a></div>
        </div>
      </header>
      ${bodyHtml}
      <footer class="restaurant-footer">
        <figure class="restaurant-footer-visual">
          ${footerImage ? `<img src="${esc(footerImage)}" alt="" width="1536" height="1024" loading="lazy">` : ''}
          <figcaption><span>${rtl ? 'نلتقي حول المائدة' : 'Meet us at the table'}</span><h2>${rtl ? 'كل مساء يبدأ بطبق.' : 'Every evening begins with a plate.'}</h2><a href="tel:${esc(r.phone.replace(/\s/g,''))}">${rtl ? 'احجز عبر الهاتف' : 'Reserve by phone'} ↗</a></figcaption>
        </figure>
        <div class="restaurant-footer-grid">
          <div class="restaurant-footer-brand"><span>${esc(r.logoText)}</span><div><strong>${esc(rt.name || r.name)}</strong><p>${esc(rt.type || r.type)}</p></div></div>
          <div class="restaurant-footer-contact"><small>${rtl ? 'الموقع والتواصل' : 'Location & contact'}</small><div class="restaurant-quick-info"><span>⌖ ${esc(rt.address || r.address)}</span><a href="tel:${esc(r.phone.replace(/\s/g,''))}"><bdi>${esc(r.phone)}</bdi></a></div></div>
          ${r.hours.length ? `<div><small>${rtl ? 'ساعات العمل' : 'Opening hours'}</small>${r.hours.map(row => `<p>${esc(rtl ? row.daysAr : row.days)}<br>${esc(rtl ? row.timeAr : row.time)}</p>`).join('')}</div>` : ''}
          ${r.instagram || r.whatsapp ? `<div><small>${rtl ? 'تواصل معنا' : 'Follow & contact'}</small><p>${esc(r.instagram)}</p><a href="https://wa.me/${esc(r.whatsapp.replace(/\D/g,''))}">WhatsApp <bdi>${esc(r.whatsapp)}</bdi> ↗</a></div>` : ''}
        </div>
        <div class="restaurant-footer-meta"><p class="allergen-notice">${esc(rt.allergenNotice || r.allergenNotice)}</p><p class="menu-credit">Menu by <a href="/">DAIFY</a> · © 2026 ${esc(rt.name || r.name)}</p></div>
      </footer>
    </div>`;
  }