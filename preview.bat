@echo off
REM Apercu local du site SOMACOS (site + formulaires + espace admin)
REM Site : http://localhost:8080   -   Admin : http://localhost:8080/admin/  (mot de passe local : somacos)
cd /d "%~dp0"
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080/admin/
  node local.mjs
  pause
  goto :eof
)
echo Node.js est necessaire pour l'apercu local.
echo Installez Node.js depuis https://nodejs.org puis relancez ce fichier.
pause
