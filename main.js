/* JISHNU.SYS — shared client-side glue */

(function () {
  const sfx = (name) => {
    if (window.JS && window.JS.audio) window.JS.audio.play(name);
  };

  // ── Audio toggle button + M key shortcut ──────────────
  const audioBtn = document.getElementById('audio-toggle');
  if (audioBtn && window.JS && window.JS.audio) {
    audioBtn.setAttribute('aria-pressed', window.JS.audio.isMuted() ? 'true' : 'false');
    audioBtn.addEventListener('click', () => {
      const wasMuted = window.JS.audio.isMuted();
      window.JS.audio.toggleMuted();
      // play a click going FROM muted → unmuted so user gets feedback
      if (wasMuted) sfx('click');
    });
  }
  document.addEventListener('keydown', (e) => {
    if (/input|textarea|select/i.test(e.target.tagName || '')) return;
    if (e.key && e.key.toLowerCase() === 'm' && !e.altKey && !e.metaKey && !e.ctrlKey) {
      if (window.JS && window.JS.audio) window.JS.audio.toggleMuted();
    }
  });

  // ── Generic UI click sounds (event delegation) ────────
  // Anchor-style buttons (.pbtn anchors, nav links) need preventDefault +
  // a small delay so the click sfx isn't killed by page navigation.
  function handleAnchorClick(a, e) {
    // modifier-clicks (new tab/window/download) → leave alone
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    // explicit new-tab → just play, current page stays
    if (a.target === '_blank') { sfx('click'); return; }
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#')) { sfx('click'); return; }
    // muted → don't add latency, just navigate
    if (!window.JS || !window.JS.audio || window.JS.audio.isMuted()) return;
    e.preventDefault();
    sfx('click');
    setTimeout(() => { window.location.href = href; }, 130);
  }

  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t || !t.closest) return;

    // anchor-styled buttons + nav links → delayed navigation
    const a = t.closest('a.pbtn, .nav a');
    if (a) { handleAnchorClick(a, e); return; }

    // everything else (real <button>, role=button, .pbtn on <button>)
    if (t.closest('button, [role="button"], .pbtn')) {
      sfx('click');
    }
  });

  // ── Subtle hover sound (desktop only, throttled) ──────
  if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let lastHover = 0;
    document.querySelectorAll('.nav a, .filter-btn').forEach((el) => {
      el.addEventListener('mouseenter', () => {
        const now = performance.now();
        if (now - lastHover < 90) return;
        lastHover = now;
        sfx('hover');
      });
    });
  }

  // ── Mobile nav: hamburger toggle ──────────────────────
  const navToggle = document.getElementById('nav-toggle');
  const nav = document.getElementById('primary-nav');
  if (navToggle && nav) {
    navToggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      navToggle.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) sfx('menuOpen');
    });
    // close mobile drawer when a nav link is tapped (sound + delayed-nav
    // is handled by the global delegated click handler above)
    nav.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        nav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      });
    });
    // close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        navToggle.classList.remove('is-open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ── Live clock in topbar ──────────────────────────────
  const clock = document.getElementById('clock');
  if (clock) {
    const tick = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const ss = String(d.getSeconds()).padStart(2, '0');
      clock.textContent = `${hh}:${mm}:${ss} IST`;
    };
    tick();
    setInterval(tick, 1000);
  }

  // ── Animate skill bars when they appear ───────────────
  const fills = document.querySelectorAll('.skill__fill[data-lv]');
  if (fills.length) {
    const fire = () => {
      fills.forEach((el) => {
        const lv = Number(el.dataset.lv) || 0;
        el.style.width = lv + '%';
      });
    };
    setTimeout(fire, 350);
  }

  // ── Contact form: AJAX submit with in-place retro success ──
  const form    = document.getElementById('contact-form');
  const status  = document.getElementById('send-status');
  const success = document.getElementById('contact-success');
  const reset   = document.getElementById('contact-reset');

  if (form && status) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = '► TRANSMITTING...';
      status.classList.remove('is-err');

      const data = Object.fromEntries(new FormData(form).entries());
      try {
        const r = await fetch('https://api.web3forms.com/submit', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept':       'application/json',
          },
          body: JSON.stringify(data),
        });
        const j = await r.json().catch(() => ({}));
        console.log('[contact-form]', r.status, j);
        if (!r.ok) throw new Error(j.message || ('http ' + r.status));
        if (!j || j.success !== true) {
          throw new Error(j.message || 'submission rejected');
        }
        status.textContent = '';
        form.hidden = true;
        if (success) success.hidden = false;
        sfx('submitSuccess');
      } catch (err) {
        console.error('[contact-form]', err);
        const msg = (err && err.message) ? String(err.message).toUpperCase() : 'TRANSMISSION FAILED';
        status.textContent = '✕ ' + msg.slice(0, 90);
        status.classList.add('is-err');
        sfx('submitError');
      }
    });
  }

  if (reset && form && success) {
    reset.addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      success.hidden = true;
      if (status) {
        status.textContent = '';
        status.classList.remove('is-err');
      }
      const firstField = form.querySelector('input[type="text"], input[type="email"]');
      if (firstField) firstField.focus();
    });
  }

  // ── Subtle keyboard easter egg: KONAMI -> rainbow CRT ──
  const seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let i = 0;
  document.addEventListener('keydown', (e) => {
    if (e.key === seq[i]) {
      i++;
      if (i === seq.length) {
        document.body.style.animation = 'rainbow 4s steps(8) 1';
        i = 0;
        setTimeout(() => { document.body.style.animation = ''; }, 4000);
      }
    } else { i = 0; }
  });

  const style = document.createElement('style');
  style.textContent = `@keyframes rainbow {
    0%   { filter: hue-rotate(0deg); }
    100% { filter: hue-rotate(360deg); }
  }`;
  document.head.appendChild(style);
})();
