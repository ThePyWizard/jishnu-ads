/* JISHNU.SYS — audio engine
   - lazy-loads sfx files on first interaction
   - per-sound gain so volumes are balanced in code (not in the file)
   - mute persists in localStorage
   - missing files no-op silently
*/
(function () {
  const PATH = './sfx/';

  // name → { file, gain }  (gain 0..1)
  const FILES = {
    click:         { file: 'click.mp3',          gain: 0.40 },
    hover:         { file: 'hover.mp3',          gain: 0.16 },
    menuOpen:      { file: 'menu-open.mp3',      gain: 0.50 },
    pickup:        { file: 'pickup.mp3',         gain: 0.55 },
    start:         { file: 'start.mp3',          gain: 0.55 },
    levelup:       { file: 'levelup.mp3',        gain: 0.55 },
    gameover:      { file: 'gameover.mp3',       gain: 0.55 },
    unlock:        { file: 'unlock.mp3',         gain: 0.70 },
    submitSuccess: { file: 'submit-success.mp3', gain: 0.55 },
    submitError:   { file: 'submit-error.mp3',   gain: 0.50 },
  };

  const KEY = 'jishnu.audio.muted';
  const cache = {};
  const broken = {};
  let muted = (function () {
    try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  })();

  document.documentElement.classList.toggle('is-muted', muted);

  function load(name) {
    if (cache[name]) return cache[name];
    if (broken[name]) return null;
    const meta = FILES[name];
    if (!meta) return null;
    try {
      const a = new Audio(PATH + meta.file);
      a.preload = 'auto';
      a.volume = meta.gain;
      a.addEventListener('error', () => { broken[name] = true; }, { once: true });
      cache[name] = a;
      return a;
    } catch (e) {
      broken[name] = true;
      return null;
    }
  }

  function play(name) {
    if (muted) return;
    const base = load(name);
    if (!base) return;
    try {
      // clone so rapid retriggers don't interrupt each other
      const c = base.cloneNode();
      c.volume = base.volume;
      const p = c.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (e) {}
  }

  function setMuted(v) {
    muted = !!v;
    try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
    document.documentElement.classList.toggle('is-muted', muted);
    const btn = document.getElementById('audio-toggle');
    if (btn) btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
  }

  function toggleMuted() { setMuted(!muted); return muted; }
  function isMuted()     { return muted; }

  // eager-load all sounds at script init so first-click plays instantly
  Object.keys(FILES).forEach(load);

  window.JS = window.JS || {};
  window.JS.audio = { play, setMuted, toggleMuted, isMuted };
})();
