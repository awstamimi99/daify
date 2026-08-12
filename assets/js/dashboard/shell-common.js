/**
 * Toast + confirm-dialog + escape helpers shared by both the owner/manager
 * shell (shell.js) and the admin shell (admin-shell.js), so the two don't
 * duplicate this logic.
 */
(function () {
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => [...(c || document).querySelectorAll(s)];

  function esc(v) {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function toast(text, kind) {
    let el = $('.dash-save-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'dash-save-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.toggle('error', kind === 'error');
    el.classList.add('show');
    clearTimeout(el._hideTimer);
    el._hideTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function confirmDialog({ title, message, confirmLabel, danger }) {
    return new Promise(resolve => {
      let dialog = $('#globalConfirmDialog');
      if (!dialog) {
        dialog = document.createElement('dialog');
        dialog.id = 'globalConfirmDialog';
        dialog.className = 'dash-modal';
        document.body.appendChild(dialog);
      }
      dialog.innerHTML = `
        <div class="dash-modal-body">
          <div class="dash-confirm-icon ${danger ? '' : 'neutral'}">${danger ? '!' : '?'}</div>
          <div class="dash-confirm-body">
            <h2 style="margin-bottom:.3rem">${esc(title)}</h2>
            <p>${esc(message)}</p>
          </div>
          <div class="dash-modal-actions">
            <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
            <button class="btn ${danger ? 'btn--danger' : 'btn--dark'}" type="button" data-choice="confirm">${esc(confirmLabel || 'Confirm')}</button>
          </div>
        </div>`;
      dialog.showModal();
      const onClick = event => {
        const choice = event.target.dataset.choice;
        if (!choice && event.target !== dialog) return;
        dialog.removeEventListener('click', onClick);
        dialog.close();
        resolve(choice === 'confirm');
      };
      dialog.addEventListener('click', onClick);
    });
  }

  /**
   * In-dashboard plan picker + simulated payment flow. Used both when an
   * owner needs to upgrade to add another restaurant location (mode:
   * 'add-location') and from Billing's "Change plan" (mode: 'change-plan') —
   * neither should ever leave the dashboard for the public marketing site.
   * No real payment processor exists in this prototype, so the "payment"
   * step is a simulated card form; `onSubmit` performs the actual store
   * update (subscription change, restaurant creation) and returns
   * `{ ok: true }` or `{ ok: false, message }`.
   */
  function openPlanUpgradeDialog({ mode, restaurantId, onSubmit }) {
    const store = window.MenuFlowStore;
    const isAddLocation = mode === 'add-location';
    const restaurant = restaurantId ? store.listRestaurants().find(r => r.id === restaurantId) : store.getActiveRestaurant();
    const currentPlan = store.planFor(restaurant.id);
    const usage = store.usageFor(restaurant.id);
    const plans = window.MenuFlowPlansSeed || [];

    let dialog = $('#planUpgradeDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'planUpgradeDialog';
      document.body.appendChild(dialog);
    }
    dialog.className = 'dash-modal dash-modal--wide';
    if (!dialog._backdropBound) {
      dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
      dialog._backdropBound = true;
    }

    const eligible = plan => !isAddLocation || plan.limits.restaurants === 'custom' || plan.limits.restaurants > usage.restaurants;
    let selectedPlanId = (plans.find(p => eligible(p) && p.id !== currentPlan.id) || plans.find(eligible) || plans[0])?.id;
    if (!isAddLocation) selectedPlanId = currentPlan.id;
    let billingCycle = (store.getSubscription(restaurant.id) || {}).billingCycle || 'monthly';
    let pendingDetails = null;

    function planCardHtml(plan) {
      const active = plan.id === selectedPlanId;
      const disabled = !eligible(plan);
      return `<button type="button" class="plan-pick-card ${active ? 'active' : ''} ${disabled ? 'is-disabled' : ''}" data-plan="${plan.id}" ${disabled ? 'disabled' : ''}>
        ${plan.badge ? `<span class="plan-pick-badge">${esc(plan.badge)}</span>` : ''}
        <strong>${esc(plan.name)}</strong>
        <span class="plan-pick-price">${plan.customPricing ? 'Custom' : `$${plan.monthlyPrice}<small>/mo</small>`}</span>
        <p>${esc(plan.tagline)}</p>
        <ul>${(plan.highlights || []).slice(0, 3).map(h => `<li>${esc(h)}</li>`).join('')}</ul>
        ${disabled ? `<small class="plan-pick-note">Doesn't include multiple locations</small>` : ''}
      </button>`;
    }

    function renderPlanStep() {
      dialog.innerHTML = `<div class="dash-modal-body">
        <h2>${isAddLocation ? 'Add a restaurant location' : 'Change your plan'}</h2>
        <p class="dash-modal-intro">${isAddLocation
          ? `Your ${esc(currentPlan.name)} plan supports ${currentPlan.limits.restaurants} restaurant${currentPlan.limits.restaurants === 1 ? '' : 's'}. Choose a plan with room for another location to continue.`
          : `Choose the plan that's right for ${esc(restaurant.name)}.`}</p>
        ${isAddLocation ? `
          <div class="field"><label for="planNewRestName">Restaurant name</label><input id="planNewRestName" value="${esc((pendingDetails || {}).name || '')}" required /></div>
          <div class="field-row" style="margin-top:1rem">
            <div class="field"><label for="planNewRestLocation">Location</label><input id="planNewRestLocation" placeholder="City or neighborhood" value="${esc((pendingDetails || {}).location || '')}" /></div>
            <div class="field"><label for="planNewRestCuisine">Cuisine type</label><input id="planNewRestCuisine" value="${esc((pendingDetails || {}).cuisineType || '')}" /></div>
          </div>` : ''}
        <div class="plan-pick-grid" style="margin-top:${isAddLocation ? '1.5rem' : '0'}">${plans.map(planCardHtml).join('')}</div>
        <div class="dash-modal-actions">
          <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
          <button class="btn btn--dark" type="button" id="planStepNext">Continue to payment</button>
        </div>
      </div>`;
      $('[data-choice="cancel"]', dialog).addEventListener('click', () => dialog.close());
      $$('[data-plan]', dialog).forEach(btn => btn.addEventListener('click', () => {
        if (btn.disabled) return;
        selectedPlanId = btn.dataset.plan;
        renderPlanStep();
      }));
      $('#planStepNext', dialog).addEventListener('click', () => {
        if (isAddLocation) {
          const name = $('#planNewRestName', dialog).value.trim();
          pendingDetails = {
            name,
            location: $('#planNewRestLocation', dialog).value.trim(),
            cuisineType: $('#planNewRestCuisine', dialog).value.trim(),
          };
          if (!name) { $('#planNewRestName', dialog).focus(); return; }
        }
        renderPaymentStep();
      });
    }

    function renderPaymentStep() {
      const plan = plans.find(p => p.id === selectedPlanId);
      const priceLine = plan.customPricing
        ? "Custom pricing — we'll confirm your final rate; your card is saved on file."
        : billingCycle === 'yearly' ? `$${plan.yearlyMonthlyPrice}/mo · billed $${plan.yearlyTotal}/year` : `$${plan.monthlyPrice}/month`;
      const payVerb = plan.customPricing ? 'Save card' : 'Pay';
      const actionNoun = isAddLocation ? 'add restaurant' : 'change plan';

      dialog.innerHTML = `<div class="dash-modal-body">
        <h2>Payment details</h2>
        <div class="plan-pick-summary">
          <div><strong>${esc(plan.name)} plan</strong><span>${esc(priceLine)}</span></div>
          <button type="button" class="small-link" id="planStepBack">Change plan</button>
        </div>
        ${!plan.customPricing ? `<div class="dash-option-group">
          <span>Billing cycle</span>
          <div class="segmented" id="paymentCycleToggle">
            <button type="button" data-cycle="monthly" class="${billingCycle === 'monthly' ? 'active' : ''}">Monthly</button>
            <button type="button" data-cycle="yearly" class="${billingCycle === 'yearly' ? 'active' : ''}">Yearly · save $${plan.yearlySavings}/yr</button>
          </div>
        </div>` : ''}
        <form id="paymentForm" novalidate>
          <div class="field"><label for="cardName">Name on card</label><input id="cardName" autocomplete="cc-name" required /></div>
          <div class="field" style="margin-top:1rem"><label for="cardNumber">Card number</label><input id="cardNumber" inputmode="numeric" autocomplete="cc-number" placeholder="4242 4242 4242 4242" required /></div>
          <div class="field-row" style="margin-top:1rem">
            <div class="field"><label for="cardExpiry">Expiry</label><input id="cardExpiry" autocomplete="cc-exp" placeholder="MM/YY" required /></div>
            <div class="field"><label for="cardCvc">CVC</label><input id="cardCvc" inputmode="numeric" autocomplete="cc-csc" placeholder="123" required /></div>
          </div>
          <p class="dash-form-hint">Prototype tip — this is a simulated charge. Any card details work; nothing is really billed.</p>
          <div class="form-message" role="status" aria-live="polite"></div>
          <div class="dash-modal-actions">
            <button class="btn btn--ghost" type="button" data-choice="cancel">Cancel</button>
            <button class="btn btn--dark" type="submit">${payVerb} &amp; ${actionNoun}</button>
          </div>
        </form>
      </div>`;

      $('[data-choice="cancel"]', dialog).addEventListener('click', () => dialog.close());
      $('#planStepBack', dialog).addEventListener('click', renderPlanStep);
      $$('#paymentCycleToggle button', dialog).forEach(btn => btn.addEventListener('click', () => {
        billingCycle = btn.dataset.cycle;
        renderPaymentStep();
      }));

      const form = $('#paymentForm', dialog);
      form.addEventListener('submit', async event => {
        event.preventDefault();
        const messageEl = $('.form-message', form);
        const cardName = $('#cardName', form).value.trim();
        const cardNumber = $('#cardNumber', form).value.replace(/\s+/g, '');
        const expiry = $('#cardExpiry', form).value.trim();
        const cvc = $('#cardCvc', form).value.trim();
        const valid = cardName && /^\d{12,19}$/.test(cardNumber) && /^\d{2}\/\d{2}$/.test(expiry) && /^\d{3,4}$/.test(cvc);
        if (!valid) {
          messageEl.textContent = 'Please fill in valid payment details.';
          messageEl.className = 'form-message show form-message--error';
          return;
        }
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing…';
        await new Promise(resolve => setTimeout(resolve, 900));
        const result = await onSubmit(Object.assign({ planId: selectedPlanId, billingCycle }, pendingDetails || {}));
        if (result && result.ok === false) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
          messageEl.textContent = result.message || 'Something went wrong. Please try again.';
          messageEl.className = 'form-message show form-message--error';
          return;
        }
        dialog.close();
      });
    }

    renderPlanStep();
    dialog.showModal();
  }

  function menuWorkspaceTabs(active, menuId) {
    const q = menuId ? `?menu=${encodeURIComponent(menuId)}` : '';
    return [
      { id: 'content', label: 'Content', href: `menu-builder.html${q}` },
      { id: 'design', label: 'Design', href: `design.html${q}` },
      { id: 'publish', label: 'Publish', href: `publish.html${q}` },
    ].map(tab => Object.assign({}, tab, { active: tab.id === active }));
  }

  function guideMode() {
    return new URLSearchParams(location.search).get('guide') || '';
  }

  function guidedUrl(url, mode = '1') {
    const parsed = new URL(url, location.href);
    parsed.searchParams.set('guide', mode);
    return `${parsed.pathname.split('/').pop()}${parsed.search}${parsed.hash}`;
  }

  function showGuide({ step, title, message, actionLabel, action }) {
    if (!guideMode()) return null;
    document.querySelector('.dash-guide')?.remove();
    const guide = document.createElement('aside');
    guide.className = 'dash-guide';
    guide.setAttribute('role', 'status');
    guide.innerHTML = `<span>${esc(step || 'NEXT STEP')}</span><div><strong>${esc(title)}</strong><p>${esc(message)}</p></div>${actionLabel ? `<button class="btn" type="button">${esc(actionLabel)} ↗</button>` : ''}<a href="index.html" aria-label="Exit setup guide">×</a>`;
    document.querySelector('#dashContent')?.prepend(guide);
    if (actionLabel && action) guide.querySelector('button').addEventListener('click', action);
    return guide;
  }

  function completeGuide({ title, nextUrl, delay = 650 }) {
    if (!guideMode()) return false;
    let overlay = document.querySelector('.dash-guide-complete');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'dash-guide-complete';
      overlay.innerHTML = '<i>✓</i><div><span>STEP COMPLETE</span><strong></strong><small>Opening the next step…</small></div>';
      document.body.appendChild(overlay);
    }
    overlay.querySelector('strong').textContent = title;
    requestAnimationFrame(() => overlay.classList.add('show'));
    setTimeout(() => { location.href = guidedUrl(nextUrl); }, delay);
    return true;
  }

  window.MenuFlowShellCommon = { toast, confirmDialog, esc, menuWorkspaceTabs, openPlanUpgradeDialog, guideMode, guidedUrl, showGuide, completeGuide };
})();
