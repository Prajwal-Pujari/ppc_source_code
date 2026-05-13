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
sudo docker exec mes-postgres psql -U mes_db_user -d mes_factory -c "DELETE FROM activity_logs; DELETE FROM nc_records; DELETE FROM pqc_inspection_logs; DELETE FROM pqc_questions; DELETE FROM pqc_question_sets; DELETE FROM gauge_operations; DELETE FROM gauges; DELETE FROM po_line_item_operations; DELETE FROM po_line_items; DELETE FROM po_comments; DELETE FROM purchase_orders; DELETE FROM customers; DELETE FROM gauge_master_operations; DELETE FROM gauge_master; DELETE FROM operation_master; DELETE FROM factory_shifts; DELETE FROM users WHERE username != 'admin';"

echo ""
echo "[2/3] Clearing MySQL Analytics Data..."
sudo docker exec mes-mysql mysql -u root -proot -D mes_analytics -e "DELETE FROM daily_production_summary; DELETE FROM operation_performance_stats; DELETE FROM po_status_snapshots; DELETE FROM rejection_analysis_summary; DELETE FROM worker_performance_monthly;"

echo ""
echo "[3/3] Clearing Redis Cache..."
sudo docker exec mes-redis redis-cli FLUSHALL

echo ""
echo "==================================================="
echo "Data cleared successfully! You can now log in with:"
echo "User: admin"
echo "Pass: Admin@123"
echo "==================================================="
