import { Client, GatewayIntentBits, Partials } from 'discord.js';
import {
  setGuild,
  replaceMembers,
  upsertMember,
  removeMember,
} from './store.js';

const profiles = new Map();
let guildId;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.GuildMember, Partials.User],
});

function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

async function refreshProfile(user) {
  try {
    const fresh = await user.fetch({ force: true });
    profiles.set(user.id, {
      banner: fresh.bannerURL({ size: 1024 }),
      accent: fresh.accentColor != null ? hex(fresh.accentColor) : null,
    });
  } catch {}
}

function packActivity(a) {
  const start = a.timestamps?.start ? a.timestamps.start.getTime() : null;
  const end = a.timestamps?.end ? a.timestamps.end.getTime() : null;
  const out = {
    name: a.name,
    type: a.type,
    details: a.details ?? null,
    state: a.state ?? null,
    url: a.url ?? null,
    appId: a.applicationId ?? null,
    syncId: a.syncId ?? null,
    start,
    end,
    largeImage: a.assets?.largeImageURL?.({ size: 256 }) ?? null,
    largeText: a.assets?.largeText ?? null,
    smallImage: a.assets?.smallImageURL?.({ size: 256 }) ?? null,
    smallText: a.assets?.smallText ?? null,
    emoji: null,
  };
  if (a.emoji) {
    out.emoji = {
      name: a.emoji.name,
      id: a.emoji.id ?? null,
      animated: !!a.emoji.animated,
      url: a.emoji.id
        ? `https://cdn.discordapp.com/emojis/${a.emoji.id}.${a.emoji.animated ? 'gif' : 'png'}`
        : null,
    };
  }
  return out;
}

function pack(member) {
  const u = member.user;
  const prof = profiles.get(u.id) ?? {};
  return {
    id: u.id,
    username: u.username,
    globalName: u.globalName ?? null,
    displayName: member.displayName ?? u.globalName ?? u.username,
    bot: u.bot,
    avatar: member.displayAvatarURL({ size: 256, extension: 'png' }),
    decoration: u.displayAvatarDecorationURL?.({ size: 256 }) ?? null,
    banner: prof.banner ?? null,
    accent: prof.accent ?? null,
    badges: u.flags ? u.flags.toArray() : [],
    createdAt: u.createdTimestamp,
    joinedAt: member.joinedTimestamp,
    boostingSince: member.premiumSinceTimestamp ?? null,
    roles: member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
    color: member.displayHexColor && member.displayHexColor !== '#000000'
      ? member.displayHexColor
      : null,
    status: member.presence?.status ?? 'offline',
    activities: (member.presence?.activities ?? []).map(packActivity),
  };
}

client.once('clientReady', async c => {
  console.log(`logged in as ${c.user.tag}`);
  const guild = await c.guilds.fetch(guildId);
  setGuild({
    id: guild.id,
    name: guild.name,
    icon: guild.iconURL({ size: 512, extension: 'png' }),
    banner: guild.bannerURL({ size: 1024 }),
    memberCount: guild.memberCount,
  });

  const all = await guild.members.fetch();
  replaceMembers(all.map(pack));
  console.log(`cached ${all.size} members`);

  for (const m of all.values()) {
    await refreshProfile(m.user);
    upsertMember(pack(m));
  }
  console.log('profiles refreshed');
});

client.on('guildMemberAdd', async m => {
  if (m.guild.id !== guildId) return;
  upsertMember(pack(m));
  await refreshProfile(m.user);
  upsertMember(pack(m));
});

client.on('guildMemberRemove', m => {
  if (m.guild.id !== guildId) return;
  removeMember(m.id);
  profiles.delete(m.id);
});

client.on('guildMemberUpdate', (_, m) => {
  if (m.guild.id !== guildId) return;
  upsertMember(pack(m));
});

client.on('userUpdate', async (_, user) => {
  await refreshProfile(user);
  try {
    const guild = await client.guilds.fetch(guildId);
    const m = await guild.members.fetch(user.id).catch(() => null);
    if (m) upsertMember(pack(m));
  } catch {}
});

client.on('presenceUpdate', (_, p) => {
  if (!p?.guild || p.guild.id !== guildId) return;
  const m = p.member;
  if (m) upsertMember(pack(m));
});

client.on('error', e => console.error('client error:', e));

export function start(token, gid) {
  guildId = gid;
  return client.login(token);
}
