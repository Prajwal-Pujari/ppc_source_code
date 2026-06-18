#!/bin/bash

echo "==================================================="
echo "  MES Factory - Database Backup (Linux)            "
echo "==================================================="
echo ""
echo "Backing up PostgreSQL..."
sudo docker exec pqc-mes-postgres pg_dump -U pqc_mes_user -d pqc_mes -F c -f /tmp/postgres_backup.dump
sudo docker cp pqc-mes-postgres:/tmp/postgres_backup.dump ./postgres_backup.dump

echo ""
echo "Backing up MySQL..."
sudo docker exec pqc-mes-mysql mysqldump -u root -proot pqc_mes_analytics -r /tmp/mysql_backup.sql
sudo docker cp pqc-mes-mysql:/tmp/mysql_backup.sql ./mysql_backup.sql

echo ""
echo "==================================================="
echo "Backup Complete!"
echo "Files created in current folder:"
echo "- postgres_backup.dump"
echo "- mysql_backup.sql"
echo ""
echo "Keep these files safe. You can load them using restore_db.sh"
echo "==================================================="
