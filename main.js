(() => {
  'use strict';

  document.documentElement.classList.add('js-enabled');

  // Add your form handler URL here before launch. Until then, the form stays in demo mode.
  const FORM_ENDPOINT = '';
  const PRICE_TABLE = {
    sedan: { 'wheel-change': 'от 850', mounting: 'от 1 600', puncture: 'от 500' },
    suv: { 'wheel-change': 'от 1 100', mounting: 'от 2 100', puncture: 'от 700' }
  };

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const menuToggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  const siteHeader = document.querySelector('.site-header');
  const dialog = document.querySelector('#booking-dialog');
  const form = document.querySelector('#booking-form');
  const formStatus = document.querySelector('#form-status');
  const wheelWrap = document.querySelector('.wheel-wrap');
  const wheelLinks = [...document.querySelectorAll('[data-wheel-link]')];
  const trackedSections = ['page-start', 'services', 'approach', 'steps', 'pricing', 'faq']
    .map((id) => document.getElementById(id))
    .filter(Boolean);
  let lastFocusedElement = null;

  // Reveal sections as they enter view. Reduced motion and no-JS views remain readable.
  const revealItems = document.querySelectorAll('.reveal');
  if (reducedMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -28px 0px' });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  // Keep the top progress rule, right-side wheel rail, and active section in sync.
  const progressBar = document.querySelector('#scroll-progress-bar');
  const railProgress = document.querySelector('#wheel-nav-progress');
  let scrollPending = false;
  const updateScrollUI = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    if (progressBar) progressBar.style.width = `${progress * 100}%`;
    if (railProgress) railProgress.style.height = `${progress * 100}%`;

    const focusLine = window.innerHeight * 0.46;
    let current = trackedSections[0];
    trackedSections.forEach((section) => {
      if (section.getBoundingClientRect().top <= focusLine) current = section;
    });
    wheelLinks.forEach((link) => {
      const active = link.getAttribute('href') === `#${current?.id}`;
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });

    if (wheelWrap) {
      const hero = document.querySelector('.hero');
      const heroProgress = hero ? Math.min(1, Math.max(0, -hero.getBoundingClientRect().top / (hero.offsetHeight || 1))) : 0;
      wheelWrap.style.setProperty('--scroll-tilt', `${(heroProgress - 0.5) * 7}deg`);
      document.querySelector('.hero__halo')?.style.setProperty('--hero-bg-shift', `${-heroProgress * 30}px`);
    }
    scrollPending = false;
  };
  const requestScrollUI = () => {
    if (scrollPending) return;
    scrollPending = true;
    window.requestAnimationFrame(updateScrollUI);
  };
  window.addEventListener('scroll', requestScrollUI, { passive: true });
  window.addEventListener('resize', requestScrollUI, { passive: true });
  updateScrollUI();

  // Tire navigation links smoothly jump to each section and expose the current stop.
  wheelLinks.forEach((link) => link.addEventListener('click', (event) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (!target) return;
    event.preventDefault();
    const targetTop = target.id === 'page-start'
      ? 0
      : Math.max(0, window.scrollY + target.getBoundingClientRect().top - (siteHeader?.getBoundingClientRect().height || 0));
    window.scrollTo({ top: targetTop, behavior: reducedMotion ? 'auto' : 'smooth' });
    const nextHash = target.id === 'page-start' ? '' : `#${target.id}`;
    if (window.location.hash !== nextHash) {
      try {
        window.history.pushState({ section: target.id }, '', nextHash || window.location.pathname + window.location.search);
      } catch {
        // Scrolling still works in browsers that restrict history updates for local files.
      }
    }
  }));

  // Mobile menu closes after choosing a section, on outside click, or on Escape.
  const closeMenu = () => {
    if (!menuToggle || !nav) return;
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Открыть меню');
    nav.classList.remove('is-open');
  };
  menuToggle?.addEventListener('click', () => {
    const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
    menuToggle.setAttribute('aria-expanded', String(!isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Открыть меню' : 'Закрыть меню');
    nav?.classList.toggle('is-open', !isOpen);
  });
  nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('click', (event) => {
    if (!nav?.classList.contains('is-open')) return;
    if (!nav.contains(event.target) && !menuToggle?.contains(event.target)) closeMenu();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  // Change the editable example tariff for a passenger car or an SUV.
  document.querySelectorAll('[data-vehicle]').forEach((button) => {
    button.addEventListener('click', () => {
      const vehicle = button.dataset.vehicle;
      document.querySelectorAll('[data-vehicle]').forEach((option) => {
        const active = option === button;
        option.classList.toggle('is-active', active);
        option.setAttribute('aria-pressed', String(active));
      });
      Object.entries(PRICE_TABLE[vehicle] || PRICE_TABLE.sedan).forEach(([service, price]) => {
        const target = document.querySelector(`[data-price="${service}"]`);
        if (target) target.innerHTML = `${price} <small>сом</small>`;
      });
    });
  });

  // Subtle pointer parallax gives the hero wheel and service tiles a 3D response.
  if (hasFinePointer && !reducedMotion && wheelWrap) {
    const heroVisual = document.querySelector('.hero__visual');
    heroVisual?.addEventListener('pointermove', (event) => {
      const bounds = heroVisual.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      wheelWrap.style.setProperty('--pointer-y', `${(x - 0.5) * 14}deg`);
      wheelWrap.style.setProperty('--pointer-x', `${(0.5 - y) * 9}deg`);
    });
    heroVisual?.addEventListener('pointerleave', () => {
      wheelWrap.style.setProperty('--pointer-y', '0deg');
      wheelWrap.style.setProperty('--pointer-x', '0deg');
    });

    document.querySelectorAll('.service-card').forEach((card) => {
      card.addEventListener('pointermove', (event) => {
        const bounds = card.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width;
        const y = (event.clientY - bounds.top) / bounds.height;
        card.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
        card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
      });
      card.addEventListener('pointerleave', () => {
        card.style.removeProperty('--tilt-y');
        card.style.removeProperty('--tilt-x');
      });
    });
  }

  // Booking dialog restores focus and never claims a request was sent in demo mode.
  const openDialog = () => {
    if (!dialog) return;
    lastFocusedElement = document.activeElement;
    if (formStatus) formStatus.textContent = '';
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    window.setTimeout(() => dialog.querySelector('input')?.focus(), 40);
  };
  const closeDialog = () => {
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
    lastFocusedElement?.focus?.();
  };
  document.querySelectorAll('[data-open-booking]').forEach((button) => button.addEventListener('click', openDialog));
  dialog?.querySelector('.dialog-close')?.addEventListener('click', closeDialog);
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog();
  });

  form?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const submitButton = form.querySelector('[type="submit"]');
    const originalText = submitButton.innerHTML;
    const payload = Object.fromEntries(new FormData(form).entries());
    formStatus.className = 'form-status';
    if (!FORM_ENDPOINT) {
      formStatus.textContent = 'Демо-режим: заявка не отправлена. Подключите обработчик в main.js, чтобы получать обращения.';
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Request failed');
      formStatus.textContent = 'Спасибо! Заявка отправлена. Мы скоро свяжемся с вами.';
      form.reset();
      formStatus.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
    } catch {
      formStatus.textContent = 'Не удалось отправить заявку. Проверьте подключение и попробуйте ещё раз.';
      formStatus.classList.add('form-status--error');
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalText;
    }
  });

  const year = document.querySelector('#current-year');
  if (year) year.textContent = new Date().getFullYear();
})();
