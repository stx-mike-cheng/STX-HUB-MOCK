module.exports = {
  apps: [
    {
      name: "stx-hub-mock",
      script: "./server.js",
      watch: true,
      env: {
        NODE_ENV: "development"
      },
      env_production: {
        NODE_ENV: "production"
      }
    }
  ]
};