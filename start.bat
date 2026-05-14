@echo off
echo.
echo  ======================================
echo   Resume Engine - محرك السيرة الذاتية
echo  ======================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python غير موجود. حمله من python.org
    pause
    exit /b
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js غير موجود. حمله من nodejs.org
    pause
    exit /b
)

REM Install Python deps
echo [1/3] تثبيت متطلبات Python...
pip install -r requirements.txt -q

REM Install Node deps
echo [2/3] تثبيت مكتبة docx...
npm install -g docx >nul 2>&1

echo [3/3] تشغيل التطبيق...
echo.
echo  افتح المتصفح على: http://localhost:5000
echo  اضغط Ctrl+C لإيقاف التطبيق
echo.
python app.py
pause
