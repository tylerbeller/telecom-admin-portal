-- SQLite accepts both ISO timestamp text and epoch-millisecond integers for
-- TIMESTAMP columns. Hibernate writes Instant values as integers, so convert
-- older seeded text values once to keep sorting and range predicates consistent.
UPDATE customers
SET activated_at = CAST(strftime('%s', activated_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', activated_at), 4, 3) AS INTEGER)
WHERE activated_at IS NOT NULL AND typeof(activated_at) = 'text';

UPDATE customers
SET created_at = CAST(strftime('%s', created_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', created_at), 4, 3) AS INTEGER)
WHERE typeof(created_at) = 'text';

UPDATE devices
SET assigned_at = CAST(strftime('%s', assigned_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', assigned_at), 4, 3) AS INTEGER)
WHERE assigned_at IS NOT NULL AND typeof(assigned_at) = 'text';

UPDATE devices
SET created_at = CAST(strftime('%s', created_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', created_at), 4, 3) AS INTEGER)
WHERE typeof(created_at) = 'text';

UPDATE usage_records
SET recorded_at = CAST(strftime('%s', recorded_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', recorded_at), 4, 3) AS INTEGER)
WHERE typeof(recorded_at) = 'text';

UPDATE support_tickets
SET created_at = CAST(strftime('%s', created_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', created_at), 4, 3) AS INTEGER)
WHERE typeof(created_at) = 'text';

UPDATE support_tickets
SET resolved_at = CAST(strftime('%s', resolved_at) AS INTEGER) * 1000
        + CAST(substr(strftime('%f', resolved_at), 4, 3) AS INTEGER)
WHERE resolved_at IS NOT NULL AND typeof(resolved_at) = 'text';
