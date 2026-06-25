#!/usr/bin/env bash
# 医享云测试环境一键部署脚本（Linux）
# 用法：
#   export DEPLOY_ROOT=/www/medical-cloud-test   # 明天问到路径后填写
#   bash deploy/deploy-test.sh
#
# 前置：Node.js 18+、Nginx、PM2、Git（或 SFTP 上传代码）

set -euo pipefail

DEPLOY_ROOT="${DEPLOY_ROOT:-/www/medical-cloud-test}"
REPO_DIR="${REPO_DIR:-$(cd "$(dirname "$0")/.." && pwd)}"

echo "==> 部署目录: $DEPLOY_ROOT"
echo "==> 源码目录: $REPO_DIR"

mkdir -p "$DEPLOY_ROOT"

if [ "$REPO_DIR" != "$DEPLOY_ROOT" ]; then
  echo "==> 同步代码到 $DEPLOY_ROOT"
  rsync -a --delete \
    --exclude node_modules \
    --exclude backend/node_modules \
    --exclude backend/medical_cloud.db \
    --exclude dist \
    --exclude backend/dist \
    --exclude .git \
    "$REPO_DIR/" "$DEPLOY_ROOT/"
fi

cd "$DEPLOY_ROOT"

echo "==> 安装依赖并构建后端"
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "!! 请先编辑 backend/.env（JWT_SECRET、SEED_PLATFORM_TEST_PASSWORD）后再执行 seed"
fi
npm ci || npm install
npm run build

echo "==> 构建前端（API 与站点同域 /api，无需 VITE_API_BASE_URL）"
cd ..
npm ci || npm install
npm run build:skip-type-check || npm run build

echo "==> 启动/重启 PM2"
pm2 startOrReload "$DEPLOY_ROOT/deploy/ecosystem.config.cjs" --update-env
pm2 save

echo ""
echo "部署完成。请确认："
echo "  1. DNS: test.hzyx.vip → 本机公网 IP"
echo "  2. Nginx: 参考 deploy/nginx-test.hzyx.vip.conf，root 指向 $DEPLOY_ROOT/dist"
echo "  3. 首次初始化: cd $DEPLOY_ROOT/backend && npm run seed"
echo "  4. 健康检查: curl -s https://test.hzyx.vip/api/health"
echo "  5. 登录: https://test.hzyx.vip/login"
echo "  （现网旧系统仍为 http://www.hzyx.vip/#/main，请勿覆盖）"
