#!/usr/bin/env bash
# ===================================================
#   MES Factory - Update Admin Password (Linux/Ubuntu)
# ===================================================

CONTAINER=""
if docker ps --format '{{.Names}}' | grep -q "^pqc-pg-engine$"; then
    CONTAINER="pqc-pg-engine"
elif docker ps --format '{{.Names}}' | grep -q "^ppc-postgres$"; then
    CONTAINER="ppc-postgres"
elif docker ps --format '{{.Names}}' | grep -q "^mes-postgres$"; then
    CONTAINER="mes-postgres"
else
    # Try finding any container with postgres or pqc-pg in its name
    CONTAINER=$(docker ps --format '{{.Names}}' | grep -E -i "postgres|pqc-pg" | head -n 1)
fi

if [ -z "$CONTAINER" ]; then
    echo "ERROR: Could not find any running PostgreSQL container."
    echo "Running containers (`docker ps`):"
    docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
    exit 1
fi

echo "Found PostgreSQL container: $CONTAINER"
echo "Updating admin password hash..."

# Try connecting with ppc_db_user first; if role does not exist, use postgres superuser
docker exec "$CONTAINER" psql -U ppc_db_user -d ppc_factory -c "UPDATE users SET password_hash = '\$2a\$12\$NmAOaEsLTi8jWmoQSqOJPOY/z628TGNzPZXB47eUov5ku5KjoapRO' WHERE username = 'admin';" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Notice: ppc_db_user not found, connecting as 'postgres' superuser..."
    docker exec "$CONTAINER" psql -U postgres -d ppc_factory -c "UPDATE users SET password_hash = '\$2a\$12\$NmAOaEsLTi8jWmoQSqOJPOY/z628TGNzPZXB47eUov5ku5KjoapRO' WHERE username = 'admin';"
fi

if [ $? -eq 0 ]; then
    echo "==================================================="
    echo "SUCCESS: Admin password updated successfully!"
    echo "==================================================="
else
    echo "ERROR: Failed to update admin password."
fi
