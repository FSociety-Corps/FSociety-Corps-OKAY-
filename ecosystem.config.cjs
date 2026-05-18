module.exports = {
  apps: [
    {
      name: 'fsus-bot',
      script: 'src/bot.js',
      cwd: '/root/fsus',
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '300M',
    },
    {
      name: 'fsus-web',
      script: 'src/web.js',
      cwd: '/root/fsus',
      max_restarts: 10,
      restart_delay: 2000,
      max_memory_restart: '200M',
    },
  ],
};
