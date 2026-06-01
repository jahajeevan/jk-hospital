module.exports = {
  apps: [
    {
      name: 'jk-hospital-api',
      script: 'src/server.js',
      instances: process.env.WEB_CONCURRENCY || 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production'
      },
      max_memory_restart: '512M',
      kill_timeout: 10000,
      listen_timeout: 10000
    }
  ]
};

