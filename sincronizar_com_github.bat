@echo off
title FinancePro - Sincronizar com GitHub
cls
echo ================================================================
echo       FinancePro - Sincronizacao Automatica com GitHub
echo ================================================================
echo.
echo Enviando todas as alteracoes para o seu site no GitHub...
echo.

set GIT_CMD="%LOCALAPPDATA%\GitHubDesktop\app-3.6.5\resources\app\git\cmd\git.exe"

%GIT_CMD% add .
%GIT_CMD% commit -m "update: atualizacao automatica do FinancePro"
%GIT_CMD% push origin main

echo.
echo ================================================================
echo Concluido! Em 30 segundos seu link estara 100%% atualizado:
echo https://joao-isaac14.github.io/FinancePro-/
echo ================================================================
echo.
pause
