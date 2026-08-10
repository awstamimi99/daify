(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const DEMO_EMAIL = 'demo@menuflow.app';
  const DEMO_PASSWORD = 'menuflow123';
  const ERROR_EMAIL = 'error@menuflow.app';
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

  function setFieldError(form, name, message) {
    const wrap = form.querySelector(`[data-field="${name}"]`);
    const errorEl = form.querySelector(`#${name}-error`);
    const input = form.querySelector(`[name="${name}"]`);
    if (wrap) wrap.classList.toggle('has-error', Boolean(message));
    if (errorEl) errorEl.textContent = message || '';
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  function clearErrors(form) {
    $$('[data-field]', form).forEach(field => field.classList.remove('has-error'));
    $$('.field-error', form).forEach(el => { el.textContent = ''; });
    $$('input[aria-invalid]', form).forEach(el => el.setAttribute('aria-invalid', 'false'));
  }

  function focusFirstError(form) {
    const firstError = form.querySelector('.has-error');
    const target = firstError?.querySelector('input') || firstError;
    target?.focus();
  }

  function showMessage(form, text, kind) {
    const message = $('.form-message', form);
    if (!message) return;
    message.textContent = text;
    message.classList.remove('form-message--success', 'form-message--error');
    message.classList.add('show', kind === 'success' ? 'form-message--success' : 'form-message--error');
  }

  function hideMessage(form) {
    $('.form-message', form)?.classList.remove('show');
  }

  function setLoading(form, loading, loadingText) {
    const btn = form.querySelector('button[type="submit"]');
    const label = btn.querySelector('.btn-label');
    if (loading) {
      btn.dataset.originalLabel = label.textContent;
      label.innerHTML = `<span class="btn-spinner" aria-hidden="true"></span> ${loadingText}`;
      btn.disabled = true;
    } else {
      label.textContent = btn.dataset.originalLabel || label.textContent;
      btn.disabled = false;
    }
  }

  function revealSuccess(form, successPanel) {
    const box = form.closest('.auth-box');
    form.classList.add('hidden');
    box?.querySelector('.auth-switch')?.classList.add('hidden');
    successPanel.classList.remove('hidden');
    successPanel.focus();
  }

  function passwordStrength(value) {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[0-9]/.test(value) && /[a-zA-Z]/.test(value)) score++;
    if (value.length >= 12 || (/[A-Z]/.test(value) && /[^A-Za-z0-9]/.test(value))) score++;
    return Math.min(score, 3);
  }

  function initSignup() {
    const form = $('#signupForm');
    if (!form) return;
    const successPanel = $('#signupSuccess');
    const strengthMeter = $('.password-strength', form);
    const passwordInput = $('#password', form);

    passwordInput?.addEventListener('input', () => {
      strengthMeter.dataset.level = passwordInput.value ? String(passwordStrength(passwordInput.value)) : '0';
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearErrors(form);
      hideMessage(form);

      const data = Object.fromEntries(new FormData(form).entries());
      const firstName = (data.firstName || '').trim();
      const lastName = (data.lastName || '').trim();
      const email = (data.email || '').trim();
      const password = data.password || '';
      const confirmPassword = data.confirmPassword || '';
      const termsAccepted = form.querySelector('#terms').checked;

      let hasError = false;
      if (!firstName) { setFieldError(form, 'firstName', 'Enter your first name.'); hasError = true; }
      if (!lastName) { setFieldError(form, 'lastName', 'Enter your last name.'); hasError = true; }
      if (!email) { setFieldError(form, 'email', 'Enter your email address.'); hasError = true; }
      else if (!EMAIL_RE.test(email)) { setFieldError(form, 'email', 'Enter a valid email address.'); hasError = true; }
      if (!password) { setFieldError(form, 'password', 'Enter a password.'); hasError = true; }
      else if (password.length < 8) { setFieldError(form, 'password', 'Use at least 8 characters.'); hasError = true; }
      if (!confirmPassword) { setFieldError(form, 'confirmPassword', 'Confirm your password.'); hasError = true; }
      else if (password && password !== confirmPassword) { setFieldError(form, 'confirmPassword', "Passwords don't match."); hasError = true; }
      if (!termsAccepted) { setFieldError(form, 'terms', 'Please accept the Terms to continue.'); hasError = true; }

      if (hasError) {
        showMessage(form, 'Please fix the highlighted fields.', 'error');
        focusFirstError(form);
        return;
      }

      if (email.toLowerCase() === DEMO_EMAIL) {
        setFieldError(form, 'email', 'An account with this email already exists.');
        showMessage(form, 'That email is already registered — try logging in instead.', 'error');
        focusFirstError(form);
        return;
      }

      setLoading(form, true, 'Creating your account…');
      await wait(900);

      if (email.toLowerCase() === ERROR_EMAIL) {
        setLoading(form, false);
        showMessage(form, 'Something went wrong on our end. Please try again.', 'error');
        return;
      }

      setLoading(form, false);
      const nameEl = $('#signupSuccessName');
      const bodyEl = $('#signupSuccessBody');
      if (nameEl) nameEl.textContent = `You're in, ${firstName}!`;
      if (bodyEl) bodyEl.textContent = `Your 14-day Pro trial has started. We've sent a confirmation to ${email}.`;
      revealSuccess(form, successPanel);
    });
  }

  function initLogin() {
    const form = $('#loginForm');
    if (!form) return;
    const successPanel = $('#loginSuccess');

    $('#forgotPasswordLink')?.addEventListener('click', event => {
      event.preventDefault();
      showMessage(form, "Password reset isn't wired up in this prototype yet.", 'error');
    });

    form.addEventListener('submit', async event => {
      event.preventDefault();
      clearErrors(form);
      hideMessage(form);

      const data = Object.fromEntries(new FormData(form).entries());
      const email = (data.email || '').trim();
      const password = data.password || '';

      let hasError = false;
      if (!email) { setFieldError(form, 'email', 'Enter your email address.'); hasError = true; }
      else if (!EMAIL_RE.test(email)) { setFieldError(form, 'email', 'Enter a valid email address.'); hasError = true; }
      if (!password) { setFieldError(form, 'password', 'Enter your password.'); hasError = true; }

      if (hasError) {
        showMessage(form, 'Please fix the highlighted fields.', 'error');
        focusFirstError(form);
        return;
      }

      setLoading(form, true, 'Logging in…');
      await wait(700);
      setLoading(form, false);

      if (email.toLowerCase() === DEMO_EMAIL && password === DEMO_PASSWORD) {
        revealSuccess(form, successPanel);
        return;
      }

      showMessage(form, 'Incorrect email or password.', 'error');
    });
  }

  function init() {
    initSignup();
    initLogin();
  }

  document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', init) : init();
})();
