import fs from 'node:fs';
import path from 'node:path';

const file = path.resolve('data/members.json');
const tmp = file + '.tmp';

let state = { guild: null, members: [], updatedAt: 0 };

try {
  state = JSON.parse(fs.readFileSync(file, 'utf8'));
} catch {}

let writePending = false;
function persist() {
  if (writePending) return;
  writePending = true;
  setImmediate(() => {
    writePending = false;
    fs.writeFile(tmp, JSON.stringify(state), err => {
      if (err) return;
      fs.rename(tmp, file, () => {});
    });
  });
}

export function snapshot() {
  return state;
}

export function setGuild(info) {
  state.guild = info;
  state.updatedAt = Date.now();
  persist();
}

export function replaceMembers(list) {
  state.members = list;
  state.updatedAt = Date.now();
  persist();
}

export function upsertMember(entry) {
  const i = state.members.findIndex(m => m.id === entry.id);
  if (i === -1) state.members.push(entry);
  else state.members[i] = { ...state.members[i], ...entry };
  state.updatedAt = Date.now();
  persist();
}

export function removeMember(id) {
  state.members = state.members.filter(m => m.id !== id);
  state.updatedAt = Date.now();
  persist();
}
