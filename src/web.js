import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { snapshot } from './store.js';

const port = Number(process.env.PORT ?? 3001);
const app = express();

app.get('/api/members', (_, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(snapshot());
});

app.get('/favicon.ico', (_, res) => {
  const s = snapshot();
  if (s.guild?.icon) return res.redirect(s.guild.icon);
  res.status(404).end();
});

app.use(express.static(path.resolve('public'), { extensions: ['html'] }));

app.listen(port, () => {
  console.log(`http://0.0.0.0:${port}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
