@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   MES Factory - Clear Data (Windows)
echo ===================================================
echo.
echo WARNING: This will DELETE all production data across PostgreSQL, MySQL, and Redis.
echo The 'admin' user and default Factory will be PRESERVED.
echo.
set /p CONTINUE="Are you sure you want to continue? (Y/N): "
set "CONTINUE=%CONTINUE: =%"
if /i "%CONTINUE:~0,1%" neq "Y" (
    echo Reset cancelled.
    exit /b
)

echo.
echo [1/3] Clearing PostgreSQL Data...
FOR /F "tokens=*" %%i IN ('docker ps --format "{{.Names}}" ^| findstr "ppc-postgres pqc-mes-postgres"') DO set PG_CONTAINER=%%i
if "%PG_CONTAINER%"=="" (
    echo Error: PostgreSQL container is not running!
    pause
    exit /b 1
)

docker exec -i %PG_CONTAINER% psql -U pqc_mes_user -d pqc_mes < "%~dp0scripts\wipe_db.sql"
if %ERRORLEVEL% neq 0 (
    echo Error occurred while clearing PostgreSQL data!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Clearing MySQL Analytics Data...
FOR /F "tokens=*" %%i IN ('docker ps --format "{{.Names}}" ^| findstr "ppc-mysql pqc-mes-mysql"') DO set MYSQL_CONTAINER=%%i
if not "%MYSQL_CONTAINER%"=="" (
    docker exec %MYSQL_CONTAINER% mysql -u root -proot -D pqc_mes_analytics -e "DELETE FROM daily_production_summary; DELETE FROM operation_performance_stats; DELETE FROM po_status_snapshots; DELETE FROM rejection_analysis_summary; DELETE FROM worker_performance_monthly;"
) else (
    echo MySQL container not running, skipping.
)

echo.
echo [3/3] Clearing Redis Cache...
FOR /F "tokens=*" %%i IN ('docker ps --format "{{.Names}}" ^| findstr "ppc-redis pqc-mes-redis"') DO set REDIS_CONTAINER=%%i
if not "%REDIS_CONTAINER%"=="" (
    docker exec %REDIS_CONTAINER% redis-cli FLUSHALL
) else (
    echo Redis container not running, skipping.
)

echo.
echo ===================================================
echo Data cleared successfully! You can now log in with:
echo User: admin
echo Pass: Admin@123
echo ===================================================
pause
