SELECT
  c.table_name,
  c.column_name,
  c.udt_name AS enum_type,
  c.column_default
FROM information_schema.columns c
WHERE c.table_schema = 'public'
  AND c.udt_name IN (
    'notification_channel_type', 'notification_channel_type_enum',
    'notification_status', 'notification_status_enum',
    'notification_type', 'notification_type_enum'
  )
ORDER BY c.udt_name, c.table_name
