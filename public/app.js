const grid = document.getElementById('grid');
const q = document.getElementById('q');
const count = document.getElementById('count');
const guildEl = document.getElementById('guild');
const ago = document.getElementById('ago');
const statusEl = document.getElementById('status');
const viewBtns = document.querySelectorAll('.views button');
const modal = document.getElementById('modal');

let data = { guild: null, members: [], updatedAt: 0 };
let term = '';
let view = 'board';
let openId = null;

const order = { online: 0, idle: 1, dnd: 2, offline: 3 };
const dateFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'short', day: 'numeric' });
const actKind = { 0: 'playing', 1: 'streaming', 2: 'listening to', 3: 'watching', 5: 'competing in' };

function relTime(ms) {
  if (!ms) return 'never';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  if (s < 2592000) return Math.floor(s / 86400) + 'd ago';
  if (s < 31536000) return Math.floor(s / 2592000) + 'mo ago';
  const y = s / 31536000;
  return y.toFixed(y < 10 ? 1 : 0) + 'y ago';
}

function fmtClock(ms) {
  if (ms < 0) ms = 0;
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = (s % 60).toString().padStart(2, '0');
  if (h) return `${h}:${m.toString().padStart(2, '0')}:${ss}`;
  return `${m}:${ss}`;
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
    return `<div class="card${m.bot ? ' bot' : ''}" data-id="${m.id}">
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
    return `<div class="row" data-id="${m.id}">
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
  if (openId) paintModal();
}

function activityHtml(a) {
  if (a.type === 4) {
    const emoji = a.emoji?.url
      ? `<img src="${a.emoji.url}" alt="">`
      : (a.emoji?.name ? `<span>${esc(a.emoji.name)}</span>` : '');
    const text = a.state ? esc(a.state) : '';
    if (!emoji && !text) return '';
    return `<div class="custom">${emoji}<span>${text}</span></div>`;
  }

  const isSpotify = a.name === 'Spotify' && a.type === 2;
  const kindLabel = isSpotify ? 'listening to spotify' : (actKind[a.type] ?? 'doing');
  const imgSrc = a.largeImage ?? (isSpotify ? null : null);
  const imgHtml = imgSrc
    ? `<div class="act-img"><img src="${imgSrc}" alt="">${a.smallImage ? `<img class="small" src="${a.smallImage}" alt="" title="${esc(a.smallText ?? '')}">` : ''}</div>`
    : '';

  const lines = [];
  lines.push(`<div class="act-line main">${esc(isSpotify ? a.details : a.name)}</div>`);
  if (isSpotify) {
    if (a.state) lines.push(`<div class="act-line sub">by ${esc(a.state)}</div>`);
    if (a.largeText) lines.push(`<div class="act-line dim">on ${esc(a.largeText)}</div>`);
  } else {
    if (a.details) lines.push(`<div class="act-line sub">${esc(a.details)}</div>`);
    if (a.state) lines.push(`<div class="act-line dim">${esc(a.state)}</div>`);
  }

  const hasBar = a.start && a.end;
  const hasElapsed = a.start && !a.end;
  let barHtml = '';
  if (hasBar) {
    barHtml = `<div class="bar-wrap" data-start="${a.start}" data-end="${a.end}">
      <div class="bar-track"><div class="bar-fill${isSpotify ? ' spotify' : ''}"></div></div>
      <div class="bar-times"><span class="pos">0:00</span><span class="dur">${fmtClock(a.end - a.start)}</span></div>
    </div>`;
  } else if (hasElapsed) {
    barHtml = `<div class="act-line dim elapsed" data-start="${a.start}" style="margin-top:6px"></div>`;
  }

  return `<div class="act">
    ${imgHtml}
    <div class="act-body">
      <div class="act-kind${isSpotify ? ' spotify' : ''}">${kindLabel}</div>
      ${lines.join('')}
      ${barHtml}
    </div>
  </div>`;
}

function paintModal() {
  const m = data.members.find(x => x.id === openId);
  if (!m) { closeModal(); return; }

  const banner = modal.querySelector('.banner');
  if (m.banner) {
    banner.style.backgroundImage = `url(${m.banner})`;
    banner.style.background = `${m.accent ?? '#1c1c1c'} url(${m.banner}) center/cover`;
  } else {
    banner.style.background = m.accent ?? '#1c1c1c';
    banner.style.backgroundImage = '';
  }

  modal.querySelector('#m-avatar').src = m.avatar;
  const deco = modal.querySelector('#m-deco');
  if (m.decoration) { deco.src = m.decoration; deco.hidden = false; } else deco.hidden = true;
  const dot = modal.querySelector('#m-dot');
  dot.className = 'dot ' + m.status;

  const name = modal.querySelector('#m-name');
  name.textContent = m.displayName;
  name.style.color = m.color ?? '';
  modal.querySelector('#m-handle').textContent = '@' + m.username + (m.bot ? ' · bot' : '');

  const acts = modal.querySelector('#m-activities');
  const html = (m.activities ?? []).map(activityHtml).filter(Boolean).join('');
  acts.innerHTML = html ? `<h3>activity</h3>${html}` : '';

  const roles = modal.querySelector('#m-roles');
  roles.innerHTML = m.roles?.length
    ? '<h3>roles</h3><div class="roles-list">' + m.roles.map(r =>
        `<span class="role-chip" style="color:${r.color !== '#000000' ? r.color : '#aaa'}">${esc(r.name)}</span>`
      ).join('') + '</div>'
    : '';

  const joined = modal.querySelector('#m-joined');
  joined.textContent = m.joinedAt ? `joined ${dateFmt.format(m.joinedAt)} · ${relTime(m.joinedAt)}` : '';

  tickProgress();
}

function tickProgress() {
  const now = Date.now();
  modal.querySelectorAll('.bar-wrap').forEach(w => {
    const start = Number(w.dataset.start);
    const end = Number(w.dataset.end);
    const total = end - start;
    const pos = Math.max(0, Math.min(total, now - start));
    w.querySelector('.bar-fill').style.width = (pos / total * 100) + '%';
    w.querySelector('.pos').textContent = fmtClock(pos);
  });
  modal.querySelectorAll('.elapsed').forEach(e => {
    const start = Number(e.dataset.start);
    e.textContent = fmtClock(now - start) + ' elapsed';
  });
}

function openProfile(id) {
  openId = id;
  modal.hidden = false;
  paintModal();
}

function closeModal() {
  openId = null;
  modal.hidden = true;
}

grid.addEventListener('click', e => {
  const el = e.target.closest('[data-id]');
  if (el) openProfile(el.dataset.id);
});

modal.addEventListener('click', e => {
  if (e.target === modal || e.target.classList.contains('close')) closeModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !modal.hidden) closeModal();
});

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

q.addEventListener('input', e => { term = e.target.value; render(); });

viewBtns.forEach(b => b.addEventListener('click', () => {
  view = b.dataset.view;
  viewBtns.forEach(x => x.classList.toggle('on', x === b));
  render();
}));

pull();
setInterval(pull, 5000);
setInterval(() => { ago.textContent = relTime(data.updatedAt); }, 1000);
setInterval(() => { if (!modal.hidden) tickProgress(); }, 1000);
