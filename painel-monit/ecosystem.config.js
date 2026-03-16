module.exports = {
  apps: [
    {
      name: "vigia-cron",
      script: "./cron_domingo.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "vigia-web",
      script: "./start_web.js",
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
