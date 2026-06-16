-- Get all table creation statements
SELECT 
    'CREATE TABLE ' || table_schema || '.' || table_name || ' (' ||
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'USER-DEFINED' THEN udt_name
            WHEN character_maximum_length IS NOT NULL THEN data_type || '(' || character_maximum_length || ')'
            WHEN numeric_precision IS NOT NULL THEN data_type || '(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', '
    ) || ');'
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_schema, table_name;
