@echo off
cd /d "%~dp0"
title CRETE WeRoad - Aggiorna immagini

set "PY=%LOCALAPPDATA%\Programs\Python\Python314\python.exe"
if not exist "%PY%" set "PY=py"

echo ============================================  > _log.txt
echo  CRETE WeRoad - aggiornamento immagini       >> _log.txt
echo  Python: %PY%                                >> _log.txt
echo ============================================  >> _log.txt
echo. >> _log.txt

echo [1/2] Converto le immagini in WebP ...
echo [1/2] optimize_images >> _log.txt
"%PY%" python\optimize_images.py >> _log.txt 2>&1

echo [2/2] Aggiorno la cache del sito ...
echo [2/2] bump_version >> _log.txt
"%PY%" python\bump_version.py >> _log.txt 2>&1

echo.
type _log.txt
echo.
echo ============================================
echo   FATTO!  Ricarica il sito con CTRL+F5
echo   (Se qualcosa non va, apri il file _log.txt)
echo ============================================
echo.
pause
