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

echo ""
echo "[1/3] Clearing PostgreSQL Data..."
sudo docker exec -i pqc-mes-postgres psql -U pqc_mes_user -d pqc_mes << 'EOF'
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

echo ""
echo "[2/3] Clearing MySQL Analytics Data..."
sudo docker exec pqc-mes-mysql mysql -u root -proot -D pqc_mes_analytics -e "DELETE FROM daily_production_summary; DELETE FROM operation_performance_stats; DELETE FROM po_status_snapshots; DELETE FROM rejection_analysis_summary; DELETE FROM worker_performance_monthly;"

echo ""
echo "[3/3] Clearing Redis Cache..."
sudo docker exec pqc-mes-redis redis-cli FLUSHALL

echo ""
echo "==================================================="
echo "Data cleared successfully! You can now log in with:"
echo "User: admin"
echo "Pass: Admin@123"
echo "==================================================="
