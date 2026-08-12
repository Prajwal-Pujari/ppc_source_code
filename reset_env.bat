@echo off
echo ===================================================
echo   MES Factory - Clear Data (Windows)
echo ===================================================
echo.
echo WARNING: This will DELETE all production data across PostgreSQL, MySQL, and Redis.
echo The 'admin' user and default Factory will be PRESERVED.
echo.
set /p CONTINUE="Are you sure you want to continue? (Y/N): "
if /i "%CONTINUE%" neq "Y" (
    echo Reset cancelled.
    exit /b
)

echo.
echo [1/3] Clearing PostgreSQL Data...
docker exec pqc-mes-postgres psql -U pqc_mes_user -d pqc_mes -c "TRUNCATE TABLE activity_logs, nc_records, pqc_inspection_logs, pqc_inspection_plans, pqc_rejection_codes, pqc_questions, pqc_question_sets, po_line_item_operations, gauges, gauge_operations, po_line_items, po_comments, purchase_orders, lpa_audit_log_answers, lpa_audit_logs, lpa_schedules, lpa_questions, lpa_question_sets, gauge_master_operations, gauge_master, operation_master, part_master, customers, machine_setup_log_answers, machine_setup_logs, machine_setup_questions, machine_setup_question_sets, machine_master, report_configuration, pqc_shift_approvals CASCADE;"

echo.
echo [2/3] Clearing MySQL Analytics Data...
docker exec pqc-mes-mysql mysql -u root -proot -D pqc_mes_analytics -e "DELETE FROM daily_production_summary; DELETE FROM operation_performance_stats; DELETE FROM po_status_snapshots; DELETE FROM rejection_analysis_summary; DELETE FROM worker_performance_monthly;"

echo.
echo [3/3] Clearing Redis Cache...
docker exec pqc-mes-redis redis-cli FLUSHALL

echo.
echo ===================================================
echo Data cleared successfully! You can now log in with:
echo User: admin
echo Pass: Admin@123
echo ===================================================
pause
