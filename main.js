/* JISHNU.SYS — shared client-side glue */

(function () {
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

  // ── Contact form: progressive enhancement ─────────────
  const form = document.getElementById('contact-form');
  const status = document.getElementById('send-status');
  if (form && status) {
    form.addEventListener('submit', () => {
      status.textContent = '► TRANSMITTING...';
      status.classList.remove('is-err');
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
