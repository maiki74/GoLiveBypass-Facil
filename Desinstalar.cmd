@echo off
title Desinstalar GoLiveBypass
echo.
echo De qual Discord voce quer remover?
echo   1 - Discord normal (Stable)
echo   2 - Discord PTB
echo   3 - Discord Canary
echo   4 - Todos
echo.
choice /c 1234 /n /m "Digite 1, 2, 3 ou 4: "
set R=%errorlevel%
set C=
if "%R%"=="1" set C=-Clients Discord
if "%R%"=="2" set C=-Clients DiscordPTB
if "%R%"=="3" set C=-Clients DiscordCanary
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\uninstall.ps1" %C%
echo.
pause
