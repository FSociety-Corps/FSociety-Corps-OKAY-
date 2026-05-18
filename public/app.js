const grid = document.getElementById('grid');
const q = document.getElementById('q');
const count = document.getElementById('count');
const guildEl = document.getElementById('guild');
const ago = document.getElementById('ago');
const statusEl = document.getElementById('status');
const viewBtns = document.querySelectorAll('.views button');

let data = { guild: null, members: [], updatedAt: 0 };
let term = '';
let view = 'board';

const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
const dateFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });

function relTime(ms) {
  if (!ms) return 'never';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  if (s < 31536000) return Math.floor(s / 2592000) + 'mo ago';
  const years = s / 31536000;
  return years.toFixed(years < 10 ? 1 : 0) + 'y ago';
}

function esc(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function matches(m) {
  if (!term) return true;
  const t = term.toLowerCase();
  return m.displayName.toLowerCase().includes(t) || m.username.toLowerCase().includes(t);
}

function renderGrid(list) {
  list.sort((a, b) => {
    const d = (order[a.status] ?? 3) - (order[b.status] ?? 3);
    return d || a.displayName.localeCompare(b.displayName);
  });

  if (!list.length) return '<div class="empty">no matches</div>';

  return list.map(m => {
    const role = m.roles?.[0];
    const roleColor = role && role.color !== '#000000' ? role.color : '#777';
    const roleHtml = role ? `<div class="role" style="color:${roleColor}">@${esc(role.name)}</div>` : '';
    const decoHtml = m.decoration ? `<img class="deco" src="${m.decoration}" alt="">` : '';
    const nameStyle = m.color ? `style="color:${m.color}"` : '';
    return `<div class="card${m.bot ? ' bot' : ''}">
      <div class="avatar">
        <img src="${m.avatar}" alt="" loading="lazy">
        ${decoHtml}
        <span class="dot ${m.status}"></span>
      </div>
      <div class="who">
        <div class="name" ${nameStyle}>${esc(m.displayName)}</div>
        <div class="tag">@${esc(m.username)}</div>
        ${roleHtml}
      </div>
    </div>`;
  }).join('');
}

function renderBoard(list) {
  list.sort((a, b) => (a.joinedAt ?? Infinity) - (b.joinedAt ?? Infinity));

  if (!list.length) return '<div class="empty">no matches</div>';

  return list.map((m, i) => {
    const rank = i + 1;
    const rankCls = rank <= 3 ? ' r' + rank : '';
    const decoHtml = m.decoration ? `<img class="deco" src="${m.decoration}" alt="">` : '';
    const nameStyle = m.color ? `style="color:${m.color}"` : '';
    const joined = m.joinedAt
      ? `<div>${esc(relTime(m.joinedAt))}</div><div class="abs">${dateFmt.format(m.joinedAt)}</div>`
      : '<div>—</div>';
    return `<div class="row">
      <div class="rank${rankCls}">#${rank}</div>
      <div class="avatar">
        <img src="${m.avatar}" alt="" loading="lazy">
        ${decoHtml}
        <span class="dot ${m.status}"></span>
      </div>
      <div class="who">
        <div class="name" ${nameStyle}>${esc(m.displayName)}</div>
        <div class="tag">@${esc(m.username)}</div>
      </div>
      <div class="joined">${joined}</div>
    </div>`;
  }).join('');
}

function render() {
  count.textContent = data.members.length;
  guildEl.textContent = data.guild?.name ?? '—';
  ago.textContent = relTime(data.updatedAt);

  const list = data.members.filter(matches);
  grid.className = view;
  grid.innerHTML = view === 'board' ? renderBoard(list) : renderGrid(list);
}

async function pull() {
  try {
    const r = await fetch('/api/members', { cache: 'no-store' });
    if (!r.ok) throw 0;
    data = await r.json();
    statusEl.textContent = 'live';
    statusEl.classList.remove('off');
    render();
  } catch {
    statusEl.textContent = 'reconnecting';
    statusEl.classList.add('off');
  }
}

q.addEventListener('input', e => {
  term = e.target.value;
  render();
});

viewBtns.forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view;
  viewBtns.forEach(x => x.classList.toggle('on', x === b));
  render();
}));

pull();
setInterval(pull, 5000);
setInterval(() => { ago.textContent = relTime(data.updatedAt); }, 1000);
