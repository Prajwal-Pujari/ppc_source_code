#!/bin/bash

echo "==================================================="
echo "  MES Factory - Database Restore (Linux)           "
echo "==================================================="
echo ""
echo "WARNING: This will OVERWRITE your current database with the backup files!"
echo "Please make sure 'postgres_backup.dump' and 'mysql_backup.sql' are in this folder."
echo ""
read -p "Are you sure you want to restore data? (Y/N): " CONTINUE

if [[ "$CONTINUE" != "Y" && "$CONTINUE" != "y" ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
if [ ! -f "postgres_backup.dump" ]; then
    echo "ERROR: postgres_backup.dump not found! Skipping PostgreSQL restore."
else
    echo "Restoring PostgreSQL..."
    sudo docker cp ./postgres_backup.dump pqc-mes-postgres:/tmp/postgres_backup.dump
    sudo docker exec pqc-mes-postgres pg_restore -U pqc_mes_user -d pqc_mes -c --if-exists /tmp/postgres_backup.dump
fi

echo ""
if [ ! -f "mysql_backup.sql" ]; then
    echo "ERROR: mysql_backup.sql not found! Skipping MySQL restore."
else
    echo "Restoring MySQL..."
    sudo docker cp ./mysql_backup.sql pqc-mes-mysql:/tmp/mysql_backup.sql
    sudo docker exec pqc-mes-mysql mysql -u root -proot pqc_mes_analytics -e "source /tmp/mysql_backup.sql"
fi

echo ""
echo "==================================================="
echo "Restore Process Finished!"
echo "It is highly recommended to restart your backend now."
echo "==================================================="
