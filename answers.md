# Assessment answers

## D1. Yard summary by line

```sql
SELECT
    c.line_code,
    COUNT(*) FILTER (
        WHERE c.status = 'IN_YARD'
    ) AS in_yard_container_count,
    COUNT(*) FILTER (
        WHERE c.status = 'IN_YARD'
          AND EXISTS (
              SELECT 1
              FROM holds h
              WHERE h.container_id = c.id
                AND h.released_at IS NULL
          )
    ) AS in_yard_with_active_hold_count,
    ROUND(
        (
            AVG(
                EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.discharged_at))
                / 86400.0
            ) FILTER (
                WHERE c.status = 'IN_YARD'
                  AND c.discharged_at IS NOT NULL
            )
        )::numeric,
        1
    ) AS average_dwell_days
FROM container c
GROUP BY c.line_code
ORDER BY c.line_code;
```

## D2. Fix the slow event search

### Why it is slow

Reasons:

- `DATE(e.occurred_at)` makes PostgreSQL check the date of each event one by
  one. That makes it harder to quickly find only today's events.
- The search starts with `%`, so the container number can match anywhere in
  the text. A regular index cannot quickly find that kind of match.

### Rewritten query

```sql
SELECT
    c.container_no,
    e.event_type,
    e.occurred_at
FROM events AS e
JOIN container AS c
    ON c.id = e.container_id
WHERE e.occurred_at >= CURRENT_DATE
  AND e.occurred_at < CURRENT_DATE + INTERVAL '1 day'
  AND UPPER(c.container_no) LIKE '%' || UPPER($1) || '%'
ORDER BY e.occurred_at DESC;
```

Instead of changing every event's timestamp into a date, this query asks for
events from the start of today up to (but not including) the start of
tomorrow. That makes it easier for PostgreSQL to use an index on the event
time. It returns the same day's events without including tomorrow.

### Indexes

For the current backend's table and column names:

```sql
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_events_occurred_at_container
    ON events (occurred_at DESC, container_id)
    INCLUDE (event_type);

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_container_no_upper_trgm
    ON container
    USING GIN (UPPER(container_no) gin_trgm_ops);
```
