@echo off
cd /d "%~dp0"
echo Abra http://localhost:3000 no navegador.
echo Para encerrar o servidor, pressione Ctrl+C.
python -m http.server 3000 --directory dist
