/**
 * PM2 进程配置（在服务器 backend 目录执行）
 *
 *   cd /www/medical-cloud-test/backend
 *   cp ../backend/.env.example .env   # 编辑 .env
 *   npm install && npm run build
 *   npm run seed                      # 仅首次或需要重置演示数据时
 *   pm2 start ../deploy/ecosystem.config.cjs
 *   pm2 save
 */
module.exports = {
  apps: [
    {
      name: 'medical-cloud-test-api',
      cwd: __dirname.replace(/[/\\]deploy$/, '') + '/backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3006
      }
    }
  ]
}
