// Modern Visual Food Menu ("Feast") family — covers everything called out in
// the Phase 3 requirements: rendering, search, category nav, item detail
// sheet, RTL, and graceful handling of missing/empty/oversized content.
const { test, expect } = require('@playwright/test');

test.describe('Feast renderer — standalone template page', () => {
  test('renders the shared menu data with all sections and items', async ({ page }) => {
    await page.goto('/templates/feast.html');
    await expect(page.locator('.feast-card')).toHaveCount(24);
    await expect(page.locator('[data-section-link]')).toHaveCount(6);
  });

  test('search filters items and shows the empty state on no match', async ({ page }) => {
    await page.goto('/templates/feast.html');
    await page.fill('[data-menu-search]', 'sea bass');
    await expect(page.locator('.feast-card:not([hidden])')).toHaveCount(1);
    await page.fill('[data-menu-search]', 'zzz-nothing-matches-zzz');
    await expect(page.locator('.feast-empty:not([hidden])')).toHaveCount(1);
  });

  test('category nav scrolls to and activates the target section', async ({ page }) => {
    await page.goto('/templates/feast.html');
    await page.click('[data-section-link="desserts"]');
    await expect(page.locator('[data-section-link="desserts"]')).toHaveClass(/active/, { timeout: 3000 });
  });

  test('tapping an item opens the detail sheet with matching content', async ({ page }) => {
    await page.goto('/templates/feast.html');
    const card = page.locator('.feast-card').first();
    const name = await card.evaluate(el => el.dataset.detailName);
    await card.click();
    await expect(page.locator('dialog.feast-sheet[open]')).toHaveCount(1);
    await expect(page.locator('[data-sheet-name]')).toHaveText(name);
    await expect(page.locator('[data-sheet-price]')).not.toHaveText('');
    await page.click('[data-sheet-close]');
    await expect(page.locator('dialog.feast-sheet[open]')).toHaveCount(0);
  });

  test('unavailable items are flagged in both the card and the detail sheet', async ({ page }) => {
    await page.goto('/templates/feast.html');
    await expect(page.locator('.feast-card.is-unavailable')).toHaveCount(2);
    await page.locator('.feast-card.is-unavailable').first().click();
    await expect(page.locator('dialog.feast-sheet.is-unavailable[open]')).toHaveCount(1);
  });

  test('Arabic sets RTL and keeps prices legible', async ({ page }) => {
    await page.goto('/templates/feast.html?lang=ar');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('.feast-card-price bdi').first()).not.toHaveText('');
  });

  test('missing images, empty categories, and very long names render without breaking', async ({ page }) => {
    await page.goto('/templates/feast.html');
    const result = await page.evaluate(() => {
      const data = {
        restaurant: window.MenuFlowMenuData.restaurant,
        sections: [
          { id: 'empty-cat', name: 'Empty', nameAr: 'فارغ', description: '', descriptionAr: '', order: 1, items: [] },
          {
            id: 'edge-cat', name: 'Edge Cases', nameAr: 'حالات خاصة', description: '', descriptionAr: '', order: 2,
            items: [{
              id: 'edge-1',
              name: 'An Extremely Long Dish Name That Should Wrap Across Several Lines Without Breaking The Card Grid Layout At All',
              description: 'A very long description used to confirm line-clamping does not break the card.',
              price: '4.500 KD', image: null, badge: '', dietary: [], available: true, featured: false, translations: {},
            }],
          },
        ],
      };
      const root = document.querySelector('#menu-root');
      window.MenuFlowRendererRegistry.feast.render(root, data, { template: 'feast', name: 'Feast', lang: 'en' });
      return {
        emptyStateText: document.querySelector('#empty-cat .feast-empty-section')?.textContent,
        placeholderCount: document.querySelectorAll('.feast-card-media-placeholder').length,
      };
    });
    expect(result.emptyStateText).toBe('No dishes in this category yet.');
    expect(result.placeholderCount).toBe(1);
    // No thrown errors reaching here is itself the main assertion.
  });
});

test.describe('Feast — cross-system integration', () => {
  test('Template Preview Workspace defaults to mobile and renders Feast cleanly', async ({ page }) => {
    await page.goto('/template-preview.html?template=feast');
    await expect(page.locator('#tpvCanvasWrap')).toHaveAttribute('data-device', 'mobile');
    await expect(page.frameLocator('#tpvFrame').locator('.feast-card')).toHaveCount(24);
  });

  test('Template Preview Workspace always uses the full sample menu', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('menuflow_platform_v1', JSON.stringify({
        session: { activeRestaurantId: 'empty-restaurant' },
        restaurants: {
          'empty-restaurant': {
            name: 'Empty draft',
            info: {},
            menus: {
              empty: {
                id: 'main-menu',
                status: 'published',
                publishedSnapshot: { sections: [], layout: { blocks: [{ type: 'story', visible: true }] } }
              }
            }
          }
        }
      }));
    });
    await page.goto('/template-preview.html?template=atelier');
    await expect(page.frameLocator('#tpvFrame').locator('.menu-item')).toHaveCount(24);
    await expect(page.frameLocator('#tpvFrame').locator('.menu-section')).toHaveCount(6);
  });

  test('Template Preview Workspace language toggle sets RTL inside the iframe', async ({ page }) => {
    await page.goto('/template-preview.html?template=feast');
    await page.click('#tpvLang');
    await expect
      .poll(() => page.evaluate(() => document.querySelector('#tpvFrame').contentDocument?.documentElement.dir))
      .toBe('rtl');
  });

  test('Guest-facing template page carries zero dashboard/editor/preview chrome', async ({ page }) => {
    await page.goto('/templates/feast.html');
    const chrome = await page.evaluate(() => document.querySelector('.dash-shell, #dashShell, .tpv-toolbar, .preview-toolbar'));
    expect(chrome).toBeNull();
  });

  test('Customizer only exposes capabilities Feast actually supports', async ({ page }) => {
    await page.goto('/template-customizer.html?template=feast');
    await expect(page.locator('[data-capability="itemLayout"]')).toBeHidden();
    await expect(page.locator('[data-capability="sectionNav"]')).toBeHidden();
    await expect(page.locator('[data-capability="cardStyle"]')).toBeVisible();
    await expect(page.locator('[data-capability="imageStyle"]')).toBeVisible();
  });

  test('Customizer theme edits apply live to the Feast preview iframe', async ({ page }) => {
    await page.goto('/template-customizer.html?template=feast');
    await page.fill('input[data-theme="accent"]', '#ff2299');
    await expect
      .poll(() => page.frameLocator('#menuPreview').locator('.feast-menu').evaluate(
        () => getComputedStyle(document.documentElement).getPropertyValue('--restaurant-accent').trim()
      ))
      .toBe('#ff2299');
  });

  test('Customizer always shows the complete example menu', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('menuflow_platform_v1', JSON.stringify({
        session: { activeRestaurantId: 'empty-customizer' },
        restaurants: {
          'empty-customizer': {
            name: 'Empty customizer draft', info: {},
            menus: { empty: { id: 'main-menu', status: 'published', publishedSnapshot: { sections: [], layout: {} } } }
          }
        }
      }));
    });
    await page.goto('/template-customizer.html?template=feast');
    await expect(page.frameLocator('#menuPreview').locator('.feast-card')).toHaveCount(24);
    await expect(page.frameLocator('#menuPreview').locator('.feast-section')).toHaveCount(6);
  });

  test('Dashboard Design page can select Feast and renders it in the live preview', async ({ page }) => {
    await page.goto('/dashboard/design.html');
    await page.click('[data-template="feast"]');
    const confirmBtn = page.locator('.dash-modal[open] [data-choice="confirm"]');
    if (await confirmBtn.count()) await confirmBtn.click();
    await expect(page.frameLocator('#previewFrame').locator('.feast-card')).toHaveCount(24, { timeout: 5000 });
  });
});

test.describe('Classic family — unaffected by the registry refactor', () => {
  test('Atelier still renders via the classic renderer with no Feast markup', async ({ page }) => {
    await page.goto('/templates/atelier.html');
    await expect(page.locator('.menu-item')).toHaveCount(24);
    await expect(page.locator('.restaurant-hero')).toHaveCount(1);
    await expect(page.locator('.feast-card')).toHaveCount(0);
  });
});
