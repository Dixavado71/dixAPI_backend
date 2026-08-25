(() => {
  'use strict';

  const root = document.documentElement;
  const body = document.body;
  const toggle = document.querySelector('[data-theme-toggle]');
  const topButton = document.querySelector('[data-scroll-top]');
  const sections = [...document.querySelectorAll('.panel')];
  const carousel = document.querySelector('[data-carousel]');
  const moveCarousel = direction => carousel?.scrollBy({ left: direction * 300, behavior: 'smooth' });
  document.querySelector('[data-carousel-prev]')?.addEventListener('click', () => moveCarousel(-1));
  document.querySelector('[data-carousel-next]')?.addEventListener('click', () => moveCarousel(1));

  const setTheme = theme => {
    root.dataset.theme = theme;
    localStorage.setItem('database-theme', theme);
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(theme === 'dark'));
      toggle.innerHTML = theme === 'dark'
        ? '<i class="fa-solid fa-sun"></i> Claro'
        : '<i class="fa-solid fa-moon"></i> Escuro';
    }
  };

  const savedTheme = localStorage.getItem('database-theme');
  setTheme(savedTheme || 'dark');

  toggle?.addEventListener('click', () => {
    setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  document.querySelectorAll('[data-expand]').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.closest('.panel');
      const expanded = panel.classList.toggle('is-expanded');
      button.setAttribute('aria-pressed', String(expanded));
      button.innerHTML = expanded
        ? '<i class="fa-solid fa-compress"></i> Reduzir'
        : '<i class="fa-solid fa-expand"></i> Ampliar';
    });
  });

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('reveal');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  sections.forEach(section => reveal.observe(section));

  const updateScrollButton = () => topButton?.classList.toggle('visible', window.scrollY > 500);
  window.addEventListener('scroll', updateScrollButton, { passive: true });
  topButton?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateScrollButton();

  document.querySelectorAll('[data-copy]').forEach(button => {
    button.addEventListener('click', async () => {
      const text = document.querySelector(button.dataset.copy)?.innerText;
      if (!text) return;
      await navigator.clipboard?.writeText(text);
      const original = button.innerHTML;
      button.innerHTML = '<i class="fa-solid fa-check"></i> Copiado';
      setTimeout(() => { button.innerHTML = original; }, 1400);
    });
  });

  window.addEventListener('keydown', event => {
    if (event.key === '/' && document.activeElement?.tagName !== 'INPUT') {
      event.preventDefault();
      document.querySelector('[data-search]')?.focus();
    }
    if (event.key === 'Escape') document.querySelector('[data-search]')?.blur();
  });

  document.querySelector('[data-search]')?.addEventListener('input', event => {
    const query = event.target.value.trim().toLowerCase();
    sections.forEach(section => {
      section.hidden = query && !section.innerText.toLowerCase().includes(query);
    });
  });

  body.classList.add('app-ready');
})();
