import express from 'express';
import path from 'node:path';
import { snapshot } from './store.js';

export function serve(port) {
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
}
