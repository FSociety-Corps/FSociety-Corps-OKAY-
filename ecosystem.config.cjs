module.exports = {
  apps: [
    {
      name: 'fsus',
      script: 'src/index.js',
      cwd: '/root/fsus',
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '400M',
    },
  ],
};
