import 'dotenv/config';
import { start } from './bot.js';
import { serve } from './server.js';

const token = process.env.DISCORD_TOKEN;
const guildId = process.env.GUILD_ID;
const port = Number(process.env.PORT ?? 3000);

if (!token || !guildId) {
  console.error('missing DISCORD_TOKEN or GUILD_ID');
  process.exit(1);
}

serve(port);
start(token, guildId).catch(e => {
  console.error('bot failed to start:', e);
  process.exit(1);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
