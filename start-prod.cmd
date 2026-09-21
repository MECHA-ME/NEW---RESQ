@echo off
cd /d "%~dp0"
set NODE_ENV=production
node dist/server.cjs > prod-server.log 2>&1
