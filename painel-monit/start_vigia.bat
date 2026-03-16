@echo off
title Ligar Vigia.IA (Servidor 24h)
echo ===================================================
echo Iniciando Servidores do Vigia.IA para rodar 24/7...
echo ===================================================

cd /d "%~dp0"
call npx pm2 start ecosystem.config.js
call npx pm2 save
call npx pm2 startup

echo.
echo ===================================================
echo ✓ Tudo Online para sempre! Fechar essa janela preta nao derrubara o painel.
echo ✓ ACESSE: http://localhost:3000
echo ===================================================
pause
