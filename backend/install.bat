@echo off
echo Installing backend dependencies...
echo This may take a few minutes...
echo.

cd /d %~dp0
npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Installation completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Create .env file: copy .env.example .env
    echo 2. Configure DATABASE_URL in .env
    echo 3. Run: npm run prisma:generate
    echo 4. Run: npm run prisma:migrate
) else (
    echo.
    echo ========================================
    echo Installation failed!
    echo ========================================
)

pause
