/* FrameShot website: small, dependency-free interactions. */
(() => {
  window.fsReady = 1;
  const d = document;
  const root = d.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, el = d) => Array.from(el.querySelectorAll(s));

  // Theme toggle (the initial theme is set inline in <head> before paint).
  $$('[data-theme-toggle]').forEach((b) =>
    b.addEventListener('click', () => {
      const dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      b.setAttribute('aria-pressed', String(dark));
      try {
        localStorage.setItem('fs-theme', dark ? 'dark' : 'light');
      } catch (e) {}
    }),
  );

  // Mobile menu.
  const menuBtn = d.querySelector('[data-menu]');
  const nav = d.getElementById('nav');
  if (menuBtn && nav) {
    menuBtn.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      menuBtn.setAttribute('aria-expanded', String(open));
    });
    $$('a', nav).forEach((a) => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // Header border once the page scrolls (no scroll listener).
  const hdr = d.querySelector('.hdr');
  const sentinel = d.getElementById('top-sentinel');
  if (hdr && sentinel && 'IntersectionObserver' in window) {
    new IntersectionObserver(([e]) => hdr.classList.toggle('scrolled', !e.isIntersecting)).observe(sentinel);
  }

  // Reveal on scroll.
  const reveal = $$('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    );
    reveal.forEach((el) => io.observe(el));
  } else reveal.forEach((el) => el.classList.add('in'));

  // Blog topic filter. The buttons stay hidden without JavaScript, and every guide is listed anyway.
  $$('.blog-filter').forEach((bar) => {
    const grid = d.querySelector('[data-posts]');
    const empty = d.querySelector('.blog-empty');
    if (!grid) return;
    bar.hidden = false;
    const buttons = $$('button', bar);
    buttons.forEach((b) =>
      b.addEventListener('click', () => {
        const v = b.dataset.filter;
        buttons.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        let shown = 0;
        $$('[data-tag]', grid).forEach((card) => {
          const on = v === 'all' || card.dataset.tag === v;
          card.hidden = !on;
          if (on) {
            shown++;
            card.classList.add('in');
          }
        });
        if (empty) empty.hidden = shown > 0;
      }),
    );
  });

  // Pointer spotlight on cards: one listener, one write per frame, non-inherited custom properties.
  let raf = 0;
  let target = null;
  let px = 0;
  let py = 0;
  d.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      const el = e.target.closest && e.target.closest('.spot');
      if (!el) return;
      target = el;
      px = e.clientX;
      py = e.clientY;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          const r = target.getBoundingClientRect();
          target.style.setProperty('--mx', `${Math.round(px - r.left)}px`);
          target.style.setProperty('--my', `${Math.round(py - r.top)}px`);
        });
    },
    { passive: true },
  );

  // Feature tabs: accessible tablist that advances by itself (pauses on hover/focus).
  $$('[data-tabs]').forEach((wrap) => {
    const tabs = $$('[role=tab]', wrap);
    const list = wrap.querySelector('[role=tablist]');
    const select = (i, focus) => {
      tabs.forEach((t, j) => {
        const on = i === j;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const p = d.getElementById(t.getAttribute('aria-controls'));
        if (p) {
          p.hidden = !on;
          if (on) {
            p.classList.remove('show');
            void p.offsetWidth;
            p.classList.add('show');
          }
        }
      });
      if (focus) tabs[i].focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', (e) => {
        const k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (k) {
          e.preventDefault();
          select((i + k + tabs.length) % tabs.length, true);
        }
      });
      const bar = t.querySelector('.bar');
      if (bar && !reduced) bar.addEventListener('animationend', () => select((i + 1) % tabs.length));
    });
    if (reduced) list.classList.add('paused');
    const pause = () => list.classList.add('paused');
    const resume = () => !reduced && list.classList.remove('paused');
    wrap.addEventListener('pointerenter', pause);
    wrap.addEventListener('pointerleave', resume);
    wrap.addEventListener('focusin', pause);
    wrap.addEventListener('focusout', resume);
    // Only run while visible.
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting ? resume() : pause())).observe(wrap);
  });

  // Before / after slider, with a one-time sweep that shows it can be dragged.
  $$('[data-ba]').forEach((ba) => {
    const input = ba.querySelector('input');
    const set = (v) => ba.style.setProperty('--pos', `${v}%`);
    let touched = false;
    input.addEventListener('input', () => {
      touched = true;
      set(input.value);
    });
    ['pointerdown', 'keydown', 'focus'].forEach((t) => input.addEventListener(t, () => (touched = true)));
    set(input.value);
    if (reduced || !('IntersectionObserver' in window)) return;
    const keys = [
      [0, 50],
      [800, 76],
      [1700, 26],
      [2500, 50],
    ];
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        let t0 = 0;
        const step = (t) => {
          if (touched) return;
          if (!t0) t0 = t;
          const dt = t - t0;
          let i = 0;
          while (i < keys.length - 2 && dt > keys[i + 1][0]) i++;
          const [ta, va] = keys[i];
          const [tb, vb] = keys[i + 1];
          const k = Math.min(1, Math.max(0, (dt - ta) / (tb - ta)));
          const v = va + (vb - va) * (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
          set(v.toFixed(2));
          input.value = Math.round(v);
          if (dt < keys[keys.length - 1][0]) requestAnimationFrame(step);
        };
        setTimeout(() => requestAnimationFrame(step), 450);
      },
      { threshold: 0.6 },
    );
    io.observe(ba);
  });

  // Article table of contents: highlight the section being read.
  const toc = d.querySelector('.toc');
  if (toc && 'IntersectionObserver' in window) {
    const links = new Map($$('a[href^="#"]', toc).map((a) => [decodeURIComponent(a.getAttribute('href').slice(1)), a]));
    const mark = (id) => links.forEach((a, k) => (k === id ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
    const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && mark(e.target.id)), { rootMargin: '-90px 0px -65% 0px' });
    links.forEach((a, id) => {
      const h = d.getElementById(id);
      if (h) io.observe(h);
    });
  }

  // Count-up numbers.
  const counters = $$('[data-count]');
  const run = (el) => {
    const end = Number(el.dataset.count);
    const suffix = el.dataset.suffix || '';
    if (reduced || !end) return (el.textContent = end + suffix);
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) =>
      es.forEach((e) => {
        if (e.isIntersecting) {
          run(e.target);
          io.unobserve(e.target);
        }
      }),
    );
    counters.forEach((c) => io.observe(c));
  } else counters.forEach(run);

  // Live recording timer in the recorder illustration (only while visible).
  $$('[data-timer]').forEach((el) => {
    let s = 0;
    let id = 0;
    const tick = () => {
      s = (s + 1) % 600;
      el.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    };
    new IntersectionObserver(([e]) => {
      clearInterval(id);
      if (e.isIntersecting && !reduced) id = setInterval(tick, 1000);
    }).observe(el);
  });

  // The full-page scan animation needs its frame height.
  // (ResizeObserver reports the size after layout, so nothing is measured during page load.)
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver((es) => es.forEach((e) => e.target.style.setProperty('--frame-h', `${Math.round(e.contentRect.height)}px`)));
    $$('.scan').forEach((frame) => ro.observe(frame));
  }

  // Copy buttons (donation addresses).
  $$('[data-copy]').forEach((b) =>
    b.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(b.dataset.copy);
        const label = b.querySelector('span');
        const old = label.textContent;
        label.textContent = 'Copied — thank you!';
        setTimeout(() => (label.textContent = old), 2200);
      } catch (e) {}
    }),
  );
})();
