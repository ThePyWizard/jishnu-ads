/* JISHNU.SYS — Ad Vault (YouTube manifest)
   - reads videos.json
   - brand filter chips + ★ TOP PICKS toggle
   - lite-embed: thumbnail first, iframe injected only on click
   - one video plays at a time (clicking another stops the previous)
*/
(function () {
  const grid       = document.getElementById('ads-grid');
  const filtersEl  = document.getElementById('ads-filters');
  const topToggle  = document.getElementById('ads-top-toggle');
  const empty      = document.getElementById('ads-empty');
  if (!grid || !filtersEl) return;

  const delays = ['fadeup--d2','fadeup--d3','fadeup--d4','fadeup--d5','fadeup--d6'];
  let videos = [];
  let brands = [];
  let activeBrand = 'all';
  let topOnly = false;

  fetch('videos.json')
    .then((r) => r.json())
    .then((data) => {
      brands = (data && data.brands)  || [];
      videos = ((data && data.videos) || [])
        .map((v) => Object.assign({}, v, { ytid: ytId(v.url) }))
        .filter((v) => v.ytid);
      buildFilters();
      render();
    })
    .catch((err) => {
      console.error('[ads]', err);
      grid.innerHTML = '<p class="body" style="text-align:center;color:var(--pink-bright);">⚠ COULD NOT LOAD videos.json</p>';
    });

  // accept watch?v=, youtu.be/, /shorts/, /embed/
  function ytId(url) {
    if (!url) return '';
    const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/);
    return m ? m[1] : '';
  }

  function buildFilters() {
    const all = '<button class="filter-btn is-on" data-brand="all" type="button">ALL</button>';
    const chips = brands.map((b) =>
      '<button class="filter-btn" data-brand="' + esc(b.id) + '" type="button">' + esc((b.label || b.id).toUpperCase()) + '</button>'
    ).join('');
    filtersEl.innerHTML = all + chips;

    filtersEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      activeBrand = btn.dataset.brand;
      filtersEl.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
      render();
    });

    if (topToggle) {
      topToggle.addEventListener('click', () => {
        topOnly = !topOnly;
        topToggle.classList.toggle('is-on', topOnly);
        topToggle.setAttribute('aria-pressed', topOnly ? 'true' : 'false');
        topToggle.innerHTML = (topOnly ? '★' : '☆') + ' TOP PICKS';
        render();
      });
    }
  }

  function filtered() {
    return videos.filter((v) => {
      if (activeBrand !== 'all' && v.brand !== activeBrand) return false;
      if (topOnly && !v.top) return false;
      return true;
    });
  }

  function brandLabel(id) {
    const b = brands.find((b) => b.id === id);
    return b ? b.label : id;
  }

  function render() {
    const list = filtered();
    if (!list.length) {
      grid.innerHTML = '';
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    grid.innerHTML = list.map((v, i) => {
      const delay = delays[i % delays.length];
      const tools = (v.tools || [])
        .map((t) => '<span class="ad__tool">' + esc(t) + '</span>')
        .join('');
      const star  = v.top ? '<span class="ad__star" title="Top performer">★</span>' : '';
      const title = v.title || ('Ad #' + (i + 1));
      return (
        '<article class="ad fadeup ' + delay + '">' +
          '<div class="pframe"><div class="pcard">' +
            '<div class="ad__player" role="button" tabindex="0" data-ytid="' + esc(v.ytid) + '" data-title="' + esc(title) + '" aria-label="Play ' + esc(title) + '">' +
              '<img class="ad__thumb" src="https://i.ytimg.com/vi/' + esc(v.ytid) + '/hqdefault.jpg" alt="" loading="lazy" />' +
              '<span class="ad__badge">▶</span>' +
              star +
              '<div class="ad__live"></div>' +
            '</div>' +
            '<div class="ad__info">' +
              '<h3 class="ad__title">' + esc(title) + '</h3>' +
              '<div class="ad__meta">' +
                '<span class="ad__brand">' + esc(brandLabel(v.brand)) + '</span>' +
              '</div>' +
              (tools ? '<div class="ad__tools">' + tools + '</div>' : '') +
            '</div>' +
          '</div></div>' +
        '</article>'
      );
    }).join('');
  }

  // ── play / pause-others (delegated) ───────────────────
  grid.addEventListener('click', (e) => {
    const player = e.target.closest('.ad__player');
    if (!player) return;
    if (player.classList.contains('is-playing')) return;
    playVideo(player);
  });

  // keyboard: Enter / Space activates
  grid.addEventListener('keydown', (e) => {
    const player = e.target.closest && e.target.closest('.ad__player');
    if (!player) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (!player.classList.contains('is-playing')) playVideo(player);
    }
  });

  function playVideo(player) {
    // stop any currently-playing card
    grid.querySelectorAll('.ad__player.is-playing').forEach((p) => {
      if (p !== player) stopVideo(p);
    });
    player.classList.add('is-playing');
    const id    = player.dataset.ytid;
    const title = player.dataset.title || 'video';
    const live  = player.querySelector('.ad__live');
    if (!live) return;
    live.innerHTML =
      '<iframe ' +
        'src="https://www.youtube-nocookie.com/embed/' + esc(id) + '?autoplay=1&rel=0&modestbranding=1&playsinline=1" ' +
        'title="' + esc(title) + '" ' +
        'allow="autoplay; encrypted-media; picture-in-picture; fullscreen" ' +
        'allowfullscreen frameborder="0">' +
      '</iframe>';
  }

  function stopVideo(player) {
    player.classList.remove('is-playing');
    const live = player.querySelector('.ad__live');
    if (live) live.innerHTML = '';
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
})();
