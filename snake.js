/* JISHNU.SYS — Snake mini-game (5-attempt prize gate + cal.com inline) */

(function () {
  const canvas = document.getElementById('snake-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const sfx = (name) => {
    if (window.JS && window.JS.audio) window.JS.audio.play(name);
  };

  // ── tunables ──────────────────────────────────────────
  const GRID = 20;                     // 20×20 cells
  const CELL = canvas.width / GRID;    // 20px per cell
  const COLOR_BG     = '#08041a';
  const COLOR_GRID   = '#1a0e3a';
  const COLOR_HEAD   = '#ff77b3';
  const COLOR_BODY   = '#ff2e88';
  const COLOR_FOOD   = '#ffd06b';
  const COLOR_FOOD_C = '#ffe49a';

  const REQUIRED_ATTEMPTS = 5;
  // ⬇︎  Cal.com event-link slug. Format: "<your-handle>/<event-slug>"
  const CAL_LINK   = 'jishnumm/30min-audit';
  const CAL_NS     = '30min-audit';
  const CAL_ORIGIN = 'https://app.cal.com';

  // ── DOM ───────────────────────────────────────────────
  const scoreEl    = document.getElementById('score');
  const hiEl       = document.getElementById('hiscore');
  const hiEl2      = document.getElementById('hiscore-2');
  const attemptsEl = document.getElementById('attempts');
  const startMsgEl = document.getElementById('start-msg');
  const finalEl    = document.getElementById('final-score');
  const finalMsg   = document.getElementById('final-msg');
  const ovStart    = document.getElementById('overlay-start');
  const ovPause    = document.getElementById('overlay-pause');
  const ovOver     = document.getElementById('overlay-over');
  const btnStart   = document.getElementById('btn-start');
  const btnResume  = document.getElementById('btn-resume');
  const btnRetry   = document.getElementById('btn-retry');
  const dpad       = document.querySelector('.dpad');
  const badgeEl    = document.getElementById('unlock-badge');
  const badgeBtn   = document.getElementById('unlock-badge-btn');
  const btnClaim   = document.getElementById('btn-claim');
  const cabinetEl  = document.getElementById('cabinet');

  // ── persistent state ──────────────────────────────────
  const STATE_HI_KEY = 'jishnu.snake.highscore';
  const STATE_AT_KEY = 'jishnu.snake.attempts';
  let hiscore  = Number(localStorage.getItem(STATE_HI_KEY) || 0);
  let attempts = Number(localStorage.getItem(STATE_AT_KEY) || 0);
  let unlocked = attempts >= REQUIRED_ATTEMPTS;

  // ── per-game state ────────────────────────────────────
  let snake, dir, nextDir, food, score, tickMs, lastTick, running, paused, raf;

  // ── visual sync helpers ───────────────────────────────
  function syncDisplay() {
    if (hiEl)       hiEl.textContent       = hiscore;
    if (hiEl2)      hiEl2.textContent      = hiscore;
    if (attemptsEl) attemptsEl.textContent = `${Math.min(attempts, REQUIRED_ATTEMPTS)} / ${REQUIRED_ATTEMPTS}`;
    if (badgeEl)    badgeEl.classList.toggle('is-on', unlocked);
    if (btnClaim)   btnClaim.hidden = !unlocked;
    if (startMsgEl) {
      if (unlocked) {
        startMsgEl.innerHTML = '<span style="color:var(--gold);">★ AUDIT UNLOCKED ★</span><br/>claim anytime, or keep playing for a new high score.';
      } else {
        const left = REQUIRED_ATTEMPTS - attempts;
        startMsgEl.innerHTML = `eat the <b>gold</b> pixels.<br/>play <b>${left}</b> more round${left === 1 ? '' : 's'} to unlock a free <b>30-min brand audit</b>.`;
      }
    }
  }

  // ── core ──────────────────────────────────────────────
  function reset() {
    snake = [
      { x: 9, y: 10 },
      { x: 8, y: 10 },
      { x: 7, y: 10 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = dir;
    score = 0;
    tickMs = 130;
    lastTick = 0;
    paused = false;
    if (scoreEl) scoreEl.textContent = score;
    syncDisplay();
    placeFood();
    draw();
  }

  function placeFood() {
    while (true) {
      const f = {
        x: (Math.random() * GRID) | 0,
        y: (Math.random() * GRID) | 0,
      };
      if (!snake.some((s) => s.x === f.x && s.y === f.y)) {
        food = f;
        return;
      }
    }
  }

  function gameOver() {
    running = false;
    cancelAnimationFrame(raf);

    // increment attempts (any game-over counts)
    attempts += 1;
    localStorage.setItem(STATE_AT_KEY, String(attempts));
    const justUnlocked = !unlocked && attempts >= REQUIRED_ATTEMPTS;
    if (attempts >= REQUIRED_ATTEMPTS) unlocked = true;

    // hi-score
    if (score > hiscore) {
      hiscore = score;
      localStorage.setItem(STATE_HI_KEY, String(hiscore));
    }

    syncDisplay();

    finalEl.textContent = 'SCORE: ' + score;

    // build the over-screen message + play sfx
    if (justUnlocked) {
      finalMsg.innerHTML =
        '<span style="color:var(--gold);">★ AUDIT UNLOCKED ★</span><br/>' +
        'since you tried <b>5 times</b>, i appreciate the effort — you\'ve earned a free 30-min audit.';
      showToast('★ EFFORT REWARDED ★');
      sfx('unlock');
    } else if (unlocked) {
      const newHi = score === hiscore && score > 0;
      finalMsg.innerHTML =
        (newHi ? 'NEW <b>HIGH SCORE</b>. ' : '') +
        '<span style="color:var(--gold);">audit\'s still unlocked — claim it.</span>';
      sfx('gameover');
    } else {
      const left = REQUIRED_ATTEMPTS - attempts;
      const newHi = score === hiscore && score > 0;
      if (newHi) {
        finalMsg.innerHTML = 'NEW <b>HIGH SCORE</b>! <b>' + left + '</b> more round' + (left === 1 ? '' : 's') + ' to unlock the audit.';
      } else if (score >= 10) {
        finalMsg.innerHTML = 'getting warmer. <b>' + left + '</b> more round' + (left === 1 ? '' : 's') + ' to unlock.';
      } else {
        finalMsg.innerHTML = 'try again. <b>' + left + '</b> more round' + (left === 1 ? '' : 's') + ' to unlock the free audit.';
      }
      sfx('gameover');
    }

    ovOver.classList.remove('is-hidden');
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    if (!running || paused) return;
    if (!lastTick) lastTick = ts;
    if (ts - lastTick < tickMs) return;
    lastTick = ts;

    // commit queued direction (prevent 180° flip in same tick)
    if (
      (nextDir.x !== -dir.x || nextDir.y !== -dir.y) &&
      !(nextDir.x === dir.x && nextDir.y === dir.y)
    ) {
      dir = nextDir;
    }

    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

    if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) return gameOver();
    if (snake.some((s) => s.x === head.x && s.y === head.y))           return gameOver();

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      if (scoreEl) scoreEl.textContent = score;
      placeFood();
      sfx('pickup');
      if (score % 5 === 0 && tickMs > 60) {
        tickMs -= 8;
        sfx('levelup');
      }
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = COLOR_BG;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = COLOR_GRID;
    for (let i = 1; i < GRID; i++) {
      ctx.fillRect(i * CELL - 0.5, 0, 1, canvas.height);
      ctx.fillRect(0, i * CELL - 0.5, canvas.width, 1);
    }
    drawFood(food.x, food.y);
    snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? COLOR_HEAD : COLOR_BODY;
      ctx.fillRect(s.x * CELL + 1, s.y * CELL + 1, CELL - 2, CELL - 2);
      if (i === 0) {
        ctx.fillStyle = '#02010c';
        const ex = s.x * CELL, ey = s.y * CELL;
        if (dir.x === 1) {
          ctx.fillRect(ex + 12, ey + 5, 3, 3); ctx.fillRect(ex + 12, ey + 12, 3, 3);
        } else if (dir.x === -1) {
          ctx.fillRect(ex + 5, ey + 5, 3, 3); ctx.fillRect(ex + 5, ey + 12, 3, 3);
        } else if (dir.y === -1) {
          ctx.fillRect(ex + 5, ey + 5, 3, 3); ctx.fillRect(ex + 12, ey + 5, 3, 3);
        } else {
          ctx.fillRect(ex + 5, ey + 12, 3, 3); ctx.fillRect(ex + 12, ey + 12, 3, 3);
        }
      }
    });
  }

  function drawFood(gx, gy) {
    const px = gx * CELL, py = gy * CELL;
    ctx.fillStyle = COLOR_FOOD;
    ctx.fillRect(px + 4, py + 2, CELL - 8, CELL - 4);
    ctx.fillRect(px + 2, py + 4, CELL - 4, CELL - 8);
    ctx.fillStyle = COLOR_FOOD_C;
    ctx.fillRect(px + 6, py + 6, 4, 4);
  }

  // ── controls ──────────────────────────────────────────
  function setDir(name) {
    const map = {
      up:    { x:  0, y: -1 },
      down:  { x:  0, y:  1 },
      left:  { x: -1, y:  0 },
      right: { x:  1, y:  0 },
    };
    if (!map[name]) return;
    nextDir = map[name];
  }

  function start() {
    reset();
    running = true;
    ovStart.classList.add('is-hidden');
    ovPause.classList.add('is-hidden');
    ovOver.classList.add('is-hidden');
    sfx('start');
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  }

  function togglePause() {
    if (!running) return;
    paused = !paused;
    ovPause.classList.toggle('is-hidden', !paused);
    if (!paused) lastTick = 0;
  }

  btnStart.addEventListener('click', start);
  btnResume.addEventListener('click', togglePause);
  btnRetry.addEventListener('click', start);

  document.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup','w'].includes(k))    { setDir('up');    e.preventDefault(); }
    if (['arrowdown','s'].includes(k))  { setDir('down');  e.preventDefault(); }
    if (['arrowleft','a'].includes(k))  { setDir('left');  e.preventDefault(); }
    if (['arrowright','d'].includes(k)) { setDir('right'); e.preventDefault(); }
    if (k === 'p') togglePause();
    if (k === 'enter' && !running && !document.querySelector('.modal.is-open')) start();
  });

  if (dpad) {
    dpad.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-dir]');
      if (b) setDir(b.dataset.dir);
    });
  }

  // touch swipe on the cabinet
  if (cabinetEl) {
    let sx = 0, sy = 0;
    cabinetEl.addEventListener('touchstart', (e) => {
      const t = e.touches[0]; sx = t.clientX; sy = t.clientY;
    }, { passive: true });
    cabinetEl.addEventListener('touchend', (e) => {
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) < 16 && Math.abs(dy) < 16) return;
      if (Math.abs(dx) > Math.abs(dy)) setDir(dx > 0 ? 'right' : 'left');
      else                              setDir(dy > 0 ? 'down'  : 'up');
    }, { passive: true });
  }

  // ── toast helper ──────────────────────────────────────
  function showToast(text) {
    if (!cabinetEl) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    cabinetEl.appendChild(t);
    setTimeout(() => t.remove(), 1700);
  }

  // ── prize modal + cal embed ───────────────────────────
  const modal       = document.getElementById('prize-modal');
  const attShow     = document.getElementById('prize-attempts-show');
  const calFallback = document.getElementById('cal-fallback');

  if (calFallback) calFallback.href = 'https://cal.com/' + CAL_LINK;

  function openModal() {
    if (!modal) return;
    paused = true;
    if (running) ovPause.classList.add('is-hidden');
    if (attShow) attShow.textContent = attempts;
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    sfx('menuOpen');
    mountCal();
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (running) {
      lastTick = 0;
      paused = false;
    }
  }

  if (badgeBtn) badgeBtn.addEventListener('click', openModal);
  if (btnClaim) btnClaim.addEventListener('click', openModal);
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) closeModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && modal.classList.contains('is-open')) closeModal();
  });

  // Cal.com inline embed — mounted lazily the first time the modal opens
  let calMounted = false;
  function mountCal() {
    if (calMounted || typeof window.Cal !== 'function') return;
    calMounted = true;
    window.Cal('init', CAL_NS, { origin: CAL_ORIGIN });
    window.Cal.ns[CAL_NS]('inline', {
      elementOrSelector: '#my-cal-inline-30min-audit',
      config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true' },
      calLink: CAL_LINK,
    });
    window.Cal.ns[CAL_NS]('ui', {
      theme: 'dark',
      cssVarsPerTheme: {
        light: { 'cal-brand': '#ff2e88' },
        dark:  { 'cal-brand': '#ff2e88' },
      },
      hideEventTypeDetails: false,
      layout: 'month_view',
    });
  }

  // initial paint behind the start overlay
  reset();
  running = false;
})();
