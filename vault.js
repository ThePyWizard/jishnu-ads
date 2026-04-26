/* JISHNU.SYS — Prompt Vault loader & filter */

(function () {
  const grid = document.getElementById('templates');
  const filterBar = document.getElementById('filters');
  const empty = document.getElementById('empty');
  if (!grid || !filterBar) return;

  const TAG_CLASS = {
    'Travel':       'tcard__tag--cyan',
    'Mobile Apps':  'tcard__tag--pink',
    'Gaming':       'tcard__tag--orange',
    'SaaS':         'tcard__tag--cyan',
    'E-commerce':   'tcard__tag--pink',
    'Fitness':      'tcard__tag--green',
    'Beauty':       'tcard__tag--pink',
    'Food':         'tcard__tag--orange',
    'Education':    'tcard__tag--cyan',
    'AI Workflow':  'tcard__tag--green',
    'Hooks':        '',
    'Image Ad':     'tcard__tag--green',
    'Video Ad':     'tcard__tag--pink',
    'AI Prompt':    'tcard__tag--cyan',
  };

  let all = [];
  let active = 'All';
  let delays = ['fadeup--d2','fadeup--d3','fadeup--d4','fadeup--d5','fadeup--d6'];

  fetch('templates.json')
    .then((r) => r.json())
    .then((data) => {
      all = data;
      buildFilters();
      render();
    })
    .catch(() => {
      grid.innerHTML = '<p class="body" style="text-align:center;color:var(--pink-bright);">⚠ COULD NOT LOAD VAULT — RETRY LATER</p>';
    });

  function buildFilters() {
    const tags = ['All', ...Array.from(new Set(all.map((t) => t.tag)))];
    filterBar.innerHTML = tags
      .map(
        (tag) =>
          `<button class="filter-btn${tag === active ? ' is-on' : ''}" data-tag="${escape(tag)}">${escape(tag)}</button>`
      )
      .join('');
    filterBar.addEventListener('click', (e) => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      active = btn.dataset.tag;
      filterBar.querySelectorAll('.filter-btn').forEach((b) => b.classList.toggle('is-on', b === btn));
      render();
    });
  }

  function render() {
    const list = active === 'All' ? all : all.filter((t) => t.tag === active);
    if (!list.length) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }
    if (empty) empty.style.display = 'none';

    grid.innerHTML = list
      .map((t, idx) => {
        const cls = TAG_CLASS[t.tag] || '';
        const delay = delays[idx % delays.length];
        const url = t.url && t.url.trim() ? t.url : '#';
        const target = url === '#' ? '_self' : '_blank';
        return `
          <article class="tcard fadeup ${delay}">
            <a class="pframe" href="${escapeAttr(url)}" target="${target}" rel="noopener">
              <div class="pcard">
                <div class="tcard__top">
                  <h3 class="tcard__title">${escape(t.title)}</h3>
                  <span class="tcard__tag ${cls}">${escape(t.tag)}</span>
                </div>
                <p class="tcard__desc">${escape(t.description)}</p>
                <span class="tcard__open">OPEN</span>
              </div>
            </a>
          </article>`;
      })
      .join('');
  }

  function escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function escapeAttr(s) { return escape(s); }
})();
