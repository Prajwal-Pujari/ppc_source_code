#!/bin/bash

echo "==================================================="
echo "  MES Factory - Clear Data (Linux)                 "
echo "==================================================="
echo ""
echo "WARNING: This will DELETE all production data across PostgreSQL, MySQL, and Redis."
echo "The 'admin' user and default Factory will be PRESERVED."
echo ""
read -p "Are you sure you want to continue? (Y/N): " CONTINUE

if [[ "$CONTINUE" != "Y" && "$CONTINUE" != "y" ]]; then
    echo "Reset cancelled."
    exit 0
fi

PG_CONTAINER=$(sudo docker ps --format '{{.Names}}' | grep -E "^ppc-postgres$|^pqc-mes-postgres$" | head -n 1)
MYSQL_CONTAINER=$(sudo docker ps --format '{{.Names}}' | grep -E "^ppc-mysql$|^pqc-mes-mysql$" | head -n 1)
REDIS_CONTAINER=$(sudo docker ps --format '{{.Names}}' | grep -E "^ppc-redis$|^pqc-mes-redis$" | head -n 1)

if [ -z "$PG_CONTAINER" ]; then
    echo "Error: PostgreSQL container is not running!"
    exit 1
fi

echo ""
echo "[1/3] Clearing PostgreSQL Data in container: $PG_CONTAINER..."
cat << 'EOF' > /tmp/wipe_db.sql
DO $$ 
DECLARE 
    stmt text; 
BEGIN 
    SELECT 'TRUNCATE TABLE ' || string_agg(quote_ident(tablename), ', ') || ' CASCADE;' 
    INTO stmt 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename NOT IN ('users', 'factories', 'flyway_schema_history'); 
    
    IF stmt IS NOT NULL THEN 
        EXECUTE stmt; 
    END IF; 
END $$; 
DELETE FROM users WHERE username != 'admin';
EOF

sudo docker cp /tmp/wipe_db.sql ${PG_CONTAINER}:/tmp/wipe_db.sql
sudo docker exec ${PG_CONTAINER} psql -U pqc_mes_user -d pqc_mes -f /tmp/wipe_db.sql
rm /tmp/wipe_db.sql

echo ""
echo "[2/3] Clearing MySQL Analytics Data in container: $MYSQL_CONTAINER..."
if [ -n "$MYSQL_CONTAINER" ]; then
    sudo docker exec ${MYSQL_CONTAINER} mysql -u root -proot -D pqc_mes_analytics -e "DELETE FROM daily_production_summary; DELETE FROM operation_performance_stats; DELETE FROM po_status_snapshots; DELETE FROM rejection_analysis_summary; DELETE FROM worker_performance_monthly;"
else
    echo "MySQL container not found, skipping."
fi

echo ""
echo "[3/3] Clearing Redis Cache in container: $REDIS_CONTAINER..."
if [ -n "$REDIS_CONTAINER" ]; then
    sudo docker exec ${REDIS_CONTAINER} redis-cli FLUSHALL
else
    echo "Redis container not found, skipping."
fi

echo ""
echo "==================================================="
echo "Data cleared successfully! You can now log in with:"
echo "User: admin"
echo "Pass: Admin@123"
echo "==================================================="
