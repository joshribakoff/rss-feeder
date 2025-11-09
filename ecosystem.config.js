module.exports = {
  apps: [
    {
      name: "serve",
      script: "./serve.js",
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
      exec_mode: 'cluster',
    },
    {
      name: "scrape",
      script: "./scrape.js",
      env_production: {
        NODE_ENV: "production",
      },
      env_development: {
        NODE_ENV: "development",
      },
      instances: 1,
      cron_restart: "47 * * * *",
      autorestart: false,
      watch: false,
      exec_mode: 'fork',
    },
  ],
};
