#!/usr/bin/env bash
# ===================================================
#   MES Factory - Clear Data (Linux / Ubuntu)
# ===================================================

echo "==================================================="
echo "  MES Factory - Clear Data (Linux/Ubuntu)"
echo "==================================================="
echo ""
echo "WARNING: This will DELETE all production data across PostgreSQL, MySQL, and Redis."
echo "The 'admin' user and default Factory standards will be PRESERVED."
echo ""
read -p "Are you sure you want to continue? (Y/N): " CONTINUE
if [[ ! "$CONTINUE" =~ ^[Yy]$ ]]; then
    echo "Reset cancelled."
    exit 0
fi

# Detect Postgres container
PG_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "postgres" | head -n 1)
if [ -z "$PG_CONTAINER" ]; then
    PG_CONTAINER="ppc-postgres"
fi

# Detect MySQL container
MYSQL_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "mysql" | head -n 1)
if [ -z "$MYSQL_CONTAINER" ]; then
    MYSQL_CONTAINER="ppc-mysql"
fi

# Detect Redis container
REDIS_CONTAINER=$(docker ps --format '{{.Names}}' | grep -i "redis" | head -n 1)
if [ -z "$REDIS_CONTAINER" ]; then
    REDIS_CONTAINER="ppc-redis"
fi

echo ""
echo "[1/3] Clearing PostgreSQL Data ($PG_CONTAINER)..."

DB_USER="ppc_db_user"
if ! docker exec "$PG_CONTAINER" psql -U ppc_db_user -d ppc_factory -c "SELECT 1;" >/dev/null 2>&1; then
    DB_USER="postgres"
fi

docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d ppc_factory -c "
DELETE FROM activity_logs;
DELETE FROM nc_records;
DELETE FROM calibration_observations;
DELETE FROM pqc_inspection_logs;
DELETE FROM pqc_questions;
DELETE FROM pqc_question_sets;
DELETE FROM gauge_operations;
DELETE FROM gauges;
DELETE FROM po_line_item_operations;
DELETE FROM po_line_items;
DELETE FROM po_comments;
DELETE FROM purchase_orders;
DELETE FROM customers;
DELETE FROM gauge_master_operations;
DELETE FROM gauge_master;
DELETE FROM operation_master;
DELETE FROM factory_shifts;
DELETE FROM users WHERE username != 'admin';
"

echo ""
echo "[2/3] Clearing MySQL Analytics Data ($MYSQL_CONTAINER)..."
docker exec "$MYSQL_CONTAINER" mysql -u root -proot -D ppc_analytics -e "
DELETE FROM daily_production_summary;
DELETE FROM operation_performance_stats;
DELETE FROM po_status_snapshots;
DELETE FROM rejection_analysis_summary;
DELETE FROM worker_performance_monthly;
"

echo ""
echo "[3/3] Clearing Redis Cache ($REDIS_CONTAINER)..."
docker exec "$REDIS_CONTAINER" redis-cli FLUSHALL

echo ""
echo "==================================================="
echo "SUCCESS: All data cleared and environment reset!"
echo "==================================================="
