/* JISHNU.SYS — floating mixtape player
   - reads ./music/tracks.json
   - persists track index + position + collapsed state across pages
   - resumes seamlessly on page navigation (multi-page site)
   - independent of the SFX mute (M key); music has its own play/pause
*/
(function () {
  const KEY = 'jishnu.mixtape.v1';
  const TRACKS_URL = './music/tracks.json';
  const SAVE_EVERY_MS = 1500;

  const isMobile = (function () {
    try { return window.matchMedia('(max-width: 540px)').matches; }
    catch (e) { return false; }
  })();

  const state = (function load() {
    const def = { idx: 0, time: 0, playing: false, collapsed: isMobile, x: null, y: null };
    try {
      const j = JSON.parse(localStorage.getItem(KEY) || 'null');
      const merged = j ? Object.assign(def, j) : def;
      // on mobile, always start collapsed regardless of persisted state
      if (isMobile) merged.collapsed = true;
      return merged;
    } catch (e) { return def; }
  })();

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function fmt(s) {
    if (!isFinite(s) || s < 0) s = 0;
    const m = Math.floor(s / 60);
    const r = Math.floor(s % 60);
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function build() {
    const root = document.createElement('div');
    root.className = 'mxt is-collapsed';
    root.innerHTML = `
      <button class="mxt__pill" type="button" aria-label="Open mixtape player">
        <span class="mxt__pill-ico" aria-hidden="true"></span>
        <span class="mxt__pill-pulse" aria-hidden="true"></span>
        <span>MIXTAPE</span>
      </button>
      <div class="mxt__body" role="region" aria-label="Mixtape player">
        <div class="mxt__bar">
          <span class="mxt__bar-title">♫ <b>MIXTAPE</b> · SIDE A</span>
          <button class="mxt__btn mxt__min" type="button" aria-label="Minimise">_</button>
        </div>
        <div class="mxt__cass">
          <div class="mxt__reels">
            <span class="mxt__reel" aria-hidden="true"></span>
            <span class="mxt__tape" aria-hidden="true"></span>
            <span class="mxt__reel" aria-hidden="true"></span>
          </div>
        </div>
        <div class="mxt__display">
          <div class="mxt__title"><span class="mxt__title-inner">—</span></div>
          <div class="mxt__artist">—</div>
          <div class="mxt__meta">
            <span class="mxt__time">0:00 / 0:00</span>
            <span class="mxt__num">TRK 00/00</span>
          </div>
        </div>
        <div class="mxt__prog" role="slider" aria-label="Seek" tabindex="0">
          <div class="mxt__prog-fill"></div>
        </div>
        <div class="mxt__ctrls">
          <button class="mxt__c mxt__prev" type="button" aria-label="Previous track">◄◄</button>
          <button class="mxt__c mxt__c--play mxt__play" type="button" aria-label="Play/Pause">
            <span class="mxt__ic-play">▶</span><span class="mxt__ic-pause">❚❚</span>
          </button>
          <button class="mxt__c mxt__next" type="button" aria-label="Next track">►►</button>
        </div>
      </div>
    `;
    document.body.appendChild(root);
    return root;
  }

  function init(tracks) {
    if (!tracks || !tracks.length) return;
    if (state.idx >= tracks.length) state.idx = 0;

    const root = build();
    const $    = (sel) => root.querySelector(sel);
    const titleEl  = $('.mxt__title');
    const titleIn  = $('.mxt__title-inner');
    const artistEl = $('.mxt__artist');
    const timeEl   = $('.mxt__time');
    const numEl    = $('.mxt__num');
    const fillEl   = $('.mxt__prog-fill');
    const progEl   = $('.mxt__prog');
    const playBtn  = $('.mxt__play');
    const prevBtn  = $('.mxt__prev');
    const nextBtn  = $('.mxt__next');
    const minBtn   = $('.mxt__min');
    const pillBtn  = $('.mxt__pill');
    const bar      = $('.mxt__bar');

    const audio = new Audio();
    audio.preload = 'auto';

    function loadTrack(i, autoplay) {
      state.idx = ((i % tracks.length) + tracks.length) % tracks.length;
      const t = tracks[state.idx];
      audio.src = './music/' + encodeURIComponent(t.file);
      const titleText = (t.title || 'UNKNOWN').toUpperCase();
      titleIn.textContent = titleText;
      // duplicate text for marquee loop if too long
      if (titleText.length > 18) {
        titleIn.textContent = titleText + '   •   ' + titleText + '   •   ';
        titleEl.classList.add('is-marquee');
      } else {
        titleEl.classList.remove('is-marquee');
      }
      artistEl.textContent = t.artist || '';
      numEl.textContent = 'TRK ' + String(state.idx + 1).padStart(2, '0') + '/' + String(tracks.length).padStart(2, '0');
      if (autoplay) play(); else updatePlayingClass();
      save();
    }

    function play() {
      const p = audio.play();
      if (p && p.then) p.then(() => { state.playing = true; updatePlayingClass(); save(); })
                       .catch(() => { state.playing = false; updatePlayingClass(); });
      else { state.playing = true; updatePlayingClass(); save(); }
    }
    function pause() {
      audio.pause();
      state.playing = false;
      updatePlayingClass();
      save();
    }
    function toggle() { audio.paused ? play() : pause(); }
    function next() { loadTrack(state.idx + 1, true); }
    function prev() {
      // if past 3s, restart current; else previous
      if (audio.currentTime > 3) { audio.currentTime = 0; return; }
      loadTrack(state.idx - 1, true);
    }

    function updatePlayingClass() {
      root.classList.toggle('is-playing', state.playing && !audio.paused);
    }

    // ── events
    audio.addEventListener('timeupdate', () => {
      const d = audio.duration || 0;
      const c = audio.currentTime || 0;
      fillEl.style.width = (d ? (c / d * 100) : 0) + '%';
      timeEl.textContent = fmt(c) + ' / ' + fmt(d);
    });
    audio.addEventListener('ended', next);
    audio.addEventListener('loadedmetadata', () => {
      // restore time only on the originally-loaded track
      if (state._restorePending) {
        try { audio.currentTime = state.time || 0; } catch (e) {}
        state._restorePending = false;
      }
    });
    audio.addEventListener('error', () => { /* skip broken file */ next(); });

    playBtn.addEventListener('click', toggle);
    nextBtn.addEventListener('click', next);
    prevBtn.addEventListener('click', prev);

    progEl.addEventListener('click', (e) => {
      const r = progEl.getBoundingClientRect();
      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      if (audio.duration) audio.currentTime = f * audio.duration;
    });

    minBtn.addEventListener('click', () => {
      if (suppressNextClick) return;
      root.classList.add('is-collapsed');
      state.collapsed = true; save();
    });
    pillBtn.addEventListener('click', () => {
      if (suppressNextClick) return;
      root.classList.remove('is-collapsed');
      state.collapsed = false; save();
    });

    // ── drag (desktop + touch) — uses a movement threshold so taps fire clicks
    let suppressNextClick = false;
    (function dragWiring() {
      const THRESH = 6;
      let pointerDown = false, dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
      function onDown(e) {
        // don't start drag if pressing the minimise button
        if (e.target.closest('.mxt__min')) return;
        pointerDown = true;
        dragging = false;
        const p = e.touches ? e.touches[0] : e;
        sx = p.clientX; sy = p.clientY;
        const r = root.getBoundingClientRect();
        ox = r.left; oy = r.top;
      }
      function onMove(e) {
        if (!pointerDown) return;
        const p = e.touches ? e.touches[0] : e;
        const dx = p.clientX - sx;
        const dy = p.clientY - sy;
        if (!dragging) {
          if (Math.abs(dx) < THRESH && Math.abs(dy) < THRESH) return;
          dragging = true;
          root.classList.add('is-dragging');
          // switch from right/bottom anchoring to left/top so we can move freely
          root.style.right = 'auto';
          root.style.bottom = 'auto';
          root.style.left = ox + 'px';
          root.style.top  = oy + 'px';
        }
        if (e.cancelable) e.preventDefault();
        let nx = ox + dx;
        let ny = oy + dy;
        const w = root.offsetWidth, h = root.offsetHeight;
        nx = Math.max(4, Math.min(window.innerWidth  - w - 4, nx));
        ny = Math.max(4, Math.min(window.innerHeight - h - 4, ny));
        root.style.left = nx + 'px';
        root.style.top  = ny + 'px';
        state.x = nx; state.y = ny;
      }
      function onUp() {
        if (!pointerDown) return;
        pointerDown = false;
        if (dragging) {
          root.classList.remove('is-dragging');
          save();
          // a click event will fire after this drag — swallow it so we
          // don't accidentally toggle collapsed/expanded after dragging
          suppressNextClick = true;
          setTimeout(() => { suppressNextClick = false; }, 0);
        }
        dragging = false;
      }
      bar.addEventListener('mousedown', onDown);
      pillBtn.addEventListener('mousedown', onDown);
      bar.addEventListener('touchstart', onDown, { passive: true });
      pillBtn.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('mousemove', onMove);
      window.addEventListener('touchmove', onMove, { passive: false });
      window.addEventListener('mouseup', onUp);
      window.addEventListener('touchend', onUp);
    })();

    // ── persist position periodically
    setInterval(() => {
      if (state.playing && !audio.paused) {
        state.time = audio.currentTime || 0;
        save();
      }
    }, SAVE_EVERY_MS);
    window.addEventListener('pagehide', () => {
      state.time = audio.currentTime || 0;
      save();
    });

    // ── restore visual state
    if (state.collapsed) root.classList.add('is-collapsed'); else root.classList.remove('is-collapsed');
    if (state.x !== null && state.y !== null) {
      const w = 280, h = 240;
      const nx = Math.max(4, Math.min(window.innerWidth  - w - 4, state.x));
      const ny = Math.max(4, Math.min(window.innerHeight - h - 4, state.y));
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      root.style.left = nx + 'px';
      root.style.top  = ny + 'px';
    }

    // ── load current track (resume time, resume playing if it was playing)
    state._restorePending = true;
    loadTrack(state.idx, false);
    if (state.playing) {
      // browsers block autoplay without prior user interaction. Try, fall back to paused.
      const tryPlay = () => {
        const p = audio.play();
        if (p && p.catch) p.catch(() => {
          state.playing = false; updatePlayingClass(); save();
        });
      };
      tryPlay();
    }

    // expose for debugging
    window.JS = window.JS || {};
    window.JS.mixtape = { play, pause, next, prev, audio };
  }

  function start() {
    fetch(TRACKS_URL)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(init)
      .catch(() => { /* no manifest → no player, silent */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
