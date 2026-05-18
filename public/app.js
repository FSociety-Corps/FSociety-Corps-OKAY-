const grid = document.getElementById('grid');
const q = document.getElementById('q');
const count = document.getElementById('count');
const guildEl = document.getElementById('guild');
const ago = document.getElementById('ago');
const statusEl = document.getElementById('status');

let data = { guild: null, members: [], updatedAt: 0 };
let term = '';

const statusOrder = { online: 0, idle: 1, dnd: 2, offline: 3 };

function relTime(ms) {
  if (!ms) return 'never';
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 5) return 'just now';
  if (s < 60) return s + 's ago';
  if (s < 3600) return Math.floor(s / 60) + 'm ago';
  if (s < 86400) return Math.floor(s / 3600) + 'h ago';
  return Math.floor(s / 86400) + 'd ago';
}

function render() {
  const list = data.members
    .filter(m => {
      if (!term) return true;
      const t = term.toLowerCase();
      return (
        m.displayName?.toLowerCase().includes(t) ||
        m.username?.toLowerCase().includes(t) ||
        m.globalName?.toLowerCase().includes(t)
      );
    })
    .sort((a, b) => {
      const sa = statusOrder[a.status] ?? 3;
      const sb = statusOrder[b.status] ?? 3;
      if (sa !== sb) return sa - sb;
      return a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' });
    });

  count.textContent = data.members.length;
  guildEl.textContent = data.guild?.name ?? '—';
  ago.textContent = relTime(data.updatedAt);

  if (!list.length) {
    grid.innerHTML = '<div class="empty">no matches.</div>';
    return;
  }

  grid.innerHTML = list.map(m => {
    const role = m.roles?.[0];
    const roleHtml = role
      ? `<div class="role" style="color:${role.color !== '#000000' ? role.color : 'var(--dim)'}">@${escape(role.name)}</div>`
      : '';
    const decoHtml = m.decoration
      ? `<img class="deco" src="${m.decoration}" alt="" />`
      : '';
    const nameColor = m.color ? `style="color:${m.color}"` : '';
    return `
      <div class="card ${m.bot ? 'bot' : ''}">
        <div class="avatar">
          <img src="${m.avatar}" alt="" loading="lazy" />
          ${decoHtml}
          <span class="dot ${m.status}"></span>
        </div>
        <div class="who">
          <div class="name" ${nameColor}>${escape(m.displayName)}</div>
          <div class="tag">@${escape(m.username)}</div>
          ${roleHtml}
        </div>
      </div>`;
  }).join('');
}

function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

async function pull() {
  try {
    const r = await fetch('/api/members', { cache: 'no-store' });
    if (!r.ok) throw new Error(r.status);
    data = await r.json();
    statusEl.textContent = 'live';
    statusEl.classList.remove('off');
    render();
  } catch {
    statusEl.textContent = 'reconnecting…';
    statusEl.classList.add('off');
  }
}

q.addEventListener('input', e => {
  term = e.target.value;
  render();
});

pull();
setInterval(pull, 5000);
setInterval(() => { ago.textContent = relTime(data.updatedAt); }, 1000);
