@echo off
echo ===================================================
echo   MES Factory - Database Restore (Windows)
echo ===================================================
echo.
echo WARNING: This will OVERWRITE your current database with the backup files!
echo Please make sure 'postgres_backup.dump' and 'mysql_backup.sql' are in this folder.
echo.
set /p CONTINUE="Are you sure you want to restore data? (Y/N): "
if /i "%CONTINUE%" neq "Y" (
    echo Restore cancelled.
    exit /b
)

echo.
if not exist "postgres_backup.dump" (
    echo ERROR: postgres_backup.dump not found! Skipping PostgreSQL restore.
) else (
    echo Restoring PostgreSQL...
    docker cp ./postgres_backup.dump pqc-mes-postgres:/tmp/postgres_backup.dump
    docker exec pqc-mes-postgres pg_restore -U pqc_mes_user -d pqc_mes -c --if-exists /tmp/postgres_backup.dump
)

echo.
if not exist "mysql_backup.sql" (
    echo ERROR: mysql_backup.sql not found! Skipping MySQL restore.
) else (
    echo Restoring MySQL...
    docker cp ./mysql_backup.sql pqc-mes-mysql:/tmp/mysql_backup.sql
    docker exec pqc-mes-mysql mysql -u root -proot pqc_mes_analytics -e "source /tmp/mysql_backup.sql"
)

echo.
echo ===================================================
echo Restore Process Finished!
echo It is highly recommended to restart your backend now.
echo ===================================================
pause
