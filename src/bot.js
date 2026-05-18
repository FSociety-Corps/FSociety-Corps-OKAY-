import { Client, GatewayIntentBits, Partials } from 'discord.js';
import {
  setGuild,
  replaceMembers,
  upsertMember,
  removeMember,
  patchPresence,
} from './store.js';

const intents = [
  GatewayIntentBits.Guilds,
  GatewayIntentBits.GuildMembers,
  GatewayIntentBits.GuildPresences,
];

const client = new Client({
  intents,
  partials: [Partials.GuildMember, Partials.User],
});

function pack(member) {
  const u = member.user;
  return {
    id: u.id,
    username: u.username,
    globalName: u.globalName ?? null,
    displayName: member.displayName ?? u.globalName ?? u.username,
    bot: u.bot,
    avatar: member.displayAvatarURL({ size: 256, extension: 'png' }),
    decoration: u.displayAvatarDecorationURL?.({ size: 256 }) ?? null,
    accent: u.accentColor ?? null,
    joinedAt: member.joinedTimestamp,
    roles: member.roles.cache
      .filter(r => r.id !== member.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
    color: member.displayHexColor && member.displayHexColor !== '#000000'
      ? member.displayHexColor
      : null,
    status: member.presence?.status ?? 'offline',
  };
}

export async function start(token, guildId) {
  client.once('ready', async c => {
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
  });

  client.on('guildMemberAdd', m => {
    if (m.guild.id !== guildId) return;
    upsertMember(pack(m));
  });

  client.on('guildMemberRemove', m => {
    if (m.guild.id !== guildId) return;
    removeMember(m.id);
  });

  client.on('guildMemberUpdate', (_, m) => {
    if (m.guild.id !== guildId) return;
    upsertMember(pack(m));
  });

  client.on('userUpdate', async (_, user) => {
    try {
      const guild = await client.guilds.fetch(guildId);
      const m = await guild.members.fetch(user.id).catch(() => null);
      if (m) upsertMember(pack(m));
    } catch {}
  });

  client.on('presenceUpdate', (_, p) => {
    if (!p?.guild || p.guild.id !== guildId) return;
    patchPresence(p.userId, p.status);
  });

  client.on('error', e => console.error('client error:', e));

  await client.login(token);
}
