-- ============================================================================
-- PostgreSQL Initialization Script
-- Optimized for API Performance + Safe ORM Tooling (Drizzle)
--
-- REQUIRED psql variables (passed via 00_init.sh):
--   :DB_NAME
--   :MONITORING_USER
--   :MONITORING_PASSWORD
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SCHEMAS
-- ----------------------------------------------------------------------------

-- Dedicated schema for extensions (prevents ORM tools from touching them)
CREATE SCHEMA IF NOT EXISTS extensions;

-- ----------------------------------------------------------------------------
-- EXTENSIONS (INSTALLED OUTSIDE public)
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_prewarm         WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp"        WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto           WITH SCHEMA extensions;

-- Move extensions if they were previously created in public
ALTER EXTENSION pg_stat_statements SET SCHEMA extensions;
ALTER EXTENSION pg_prewarm         SET SCHEMA extensions;
ALTER EXTENSION "uuid-ossp"        SET SCHEMA extensions;
ALTER EXTENSION pgcrypto           SET SCHEMA extensions;

-- Reset statistics after extension setup (safe if extension exists)
SELECT extensions.pg_stat_statements_reset();

-- ----------------------------------------------------------------------------
-- MONITORING ROLE (env-driven)
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_catalog.pg_roles
        WHERE rolname = :'MONITORING_USER'
    ) THEN
        EXECUTE format(
            'CREATE ROLE %I WITH LOGIN PASSWORD %L',
            :'MONITORING_USER',
            :'MONITORING_PASSWORD'
        );

        -- Built-in monitoring privileges (PG 10+)
        EXECUTE format('GRANT pg_monitor TO %I', :'MONITORING_USER');
    END IF;
END $$;

-- Grants (safe to re-run)
DO $$
BEGIN
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I', :'DB_NAME', :'MONITORING_USER');
    EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', :'MONITORING_USER');
    EXECUTE format('GRANT SELECT ON ALL TABLES IN SCHEMA public TO %I', :'MONITORING_USER');
    EXECUTE format('GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO %I', :'MONITORING_USER');

    EXECUTE format(
        'ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO %I',
        :'MONITORING_USER'
    );
END $$;

-- ----------------------------------------------------------------------------
-- PERFORMANCE MONITORING VIEWS
-- ----------------------------------------------------------------------------

-- Top slow queries
CREATE OR REPLACE VIEW v_performance_stats AS
SELECT
    userid::regrole AS "user",
    dbid,
    query,
    calls,
    ROUND(total_exec_time::numeric, 2)   AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2)    AS mean_time_ms,
    ROUND(stddev_exec_time::numeric, 2)  AS stddev_time_ms,
    rows,
    ROUND(
        100.0 * shared_blks_hit /
        NULLIF(shared_blks_hit + shared_blks_read, 0),
        2
    ) AS cache_hit_ratio
FROM extensions.pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY total_exec_time DESC
LIMIT 50;

-- Table bloat monitoring
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename))       AS table_size,
    pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename))        AS indexes_size,
    n_live_tup   AS live_tuples,
    n_dead_tup   AS dead_tuples,
    ROUND(
        100.0 * n_dead_tup /
        NULLIF(n_live_tup + n_dead_tup, 0),
        2
    ) AS dead_tuple_percent,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Connection monitoring
CREATE OR REPLACE VIEW v_connections AS
SELECT
    datname           AS database,
    usename           AS "user",
    application_name,
    client_addr,
    state,
    COUNT(*)          AS connection_count,
    MAX(state_change) AS last_state_change
FROM pg_stat_activity
WHERE pid != pg_backend_pid()
GROUP BY datname, usename, application_name, client_addr, state
ORDER BY connection_count DESC;

-- Unused indexes
CREATE OR REPLACE VIEW v_unused_indexes AS
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    idx_scan      AS index_scans,
    idx_tup_read  AS tuples_read,
    idx_tup_fetch AS tuples_fetched
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND indexrelid NOT IN (
      SELECT indexrelid
      FROM pg_index
      WHERE indisunique OR indisprimary
  )
ORDER BY pg_relation_size(indexrelid) DESC;

-- ----------------------------------------------------------------------------
-- GRANTS FOR MONITORING VIEWS
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    EXECUTE format('GRANT SELECT ON v_performance_stats TO %I', :'MONITORING_USER');
    EXECUTE format('GRANT SELECT ON v_table_bloat       TO %I', :'MONITORING_USER');
    EXECUTE format('GRANT SELECT ON v_connections       TO %I', :'MONITORING_USER');
    EXECUTE format('GRANT SELECT ON v_unused_indexes    TO %I', :'MONITORING_USER');
END $$;

-- ----------------------------------------------------------------------------
-- HELPER FUNCTIONS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION prewarm_all_tables()
RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT schemaname, tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format(
            'SELECT extensions.pg_prewarm(%L)',
            quote_ident(r.schemaname) || '.' || quote_ident(r.tablename)
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- DATABASE-LEVEL OPTIMIZATION
-- ----------------------------------------------------------------------------

ALTER DATABASE :"DB_NAME" SET default_statistics_target = 100;

-- ----------------------------------------------------------------------------
-- COMPLETION NOTICE
-- ----------------------------------------------------------------------------

DO $$
BEGIN
    RAISE NOTICE 'PostgreSQL initialization complete';
    RAISE NOTICE 'Extensions installed in schema: extensions';
    RAISE NOTICE 'Monitoring role created/ensured: %', :'MONITORING_USER';
    RAISE NOTICE 'Views created: v_performance_stats, v_table_bloat, v_connections, v_unused_indexes';
    RAISE NOTICE 'Helper function created: prewarm_all_tables()';
END $$;
