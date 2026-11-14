@echo off
title Instalar GoLiveBypass
echo.
echo Qual Discord voce usa?
echo   1 - Discord normal (Stable)
echo   2 - Discord PTB
echo   3 - Discord Canary
echo   4 - Todos que estiverem instalados
echo.
choice /c 1234 /n /m "Digite 1, 2, 3 ou 4: "
set R=%errorlevel%
set C=
if "%R%"=="1" set C=-Clients Discord
if "%R%"=="2" set C=-Clients DiscordPTB
if "%R%"=="3" set C=-Clients DiscordCanary
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install.ps1" %C%
echo.
pause
