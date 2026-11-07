"""Non-destructive workspace migration for the Notion calendar API."""
import sqlite3


def migrate_workspaces(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS workspaces (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS workspace_members (
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          user_id INTEGER NOT NULL REFERENCES users(id),
          role TEXT NOT NULL CHECK(role IN ('viewer','editor')),
          PRIMARY KEY(workspace_id, user_id)
        );
        CREATE TABLE IF NOT EXISTS staffing_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          workspace_id TEXT NOT NULL REFERENCES workspaces(id),
          days TEXT NOT NULL,
          start TEXT NOT NULL,
          end TEXT NOT NULL,
          min INTEGER NOT NULL CHECK(min > 0)
        );
    """)
    workspace_columns = {r['name'] for r in conn.execute('PRAGMA table_info(workspaces)')}
    if 'type' not in workspace_columns:
        conn.execute("ALTER TABLE workspaces ADD COLUMN type TEXT NOT NULL DEFAULT ''")
    # Only the original, unscoped database is assigned to the legacy workspace.
    # Repeated startup never grants new memberships or moves existing events.
    columns = {r['name'] for r in conn.execute('PRAGMA table_info(events)')}
    if 'workspace_id' not in columns:
        conn.execute("INSERT OR IGNORE INTO workspaces(id,name) VALUES ('cafe','카페 알바')")
        conn.execute("INSERT OR IGNORE INTO workspace_members SELECT 'cafe', id, role FROM users")
        conn.execute('ALTER TABLE events ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)')
        conn.execute("UPDATE events SET workspace_id='cafe' WHERE workspace_id IS NULL")
    for table in ('edit_permission_requests',):
        columns = {r['name'] for r in conn.execute(f'PRAGMA table_info({table})')}
        if 'workspace_id' not in columns:
            conn.execute(f'ALTER TABLE {table} ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)')
            conn.execute(f"UPDATE {table} SET workspace_id='cafe' WHERE workspace_id IS NULL")
    conn.execute('CREATE INDEX IF NOT EXISTS idx_events_workspace_dates ON events(workspace_id,start_date,end_date)')
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_pending_substitute ON substitute_requests(event_id) WHERE status='pending'")
    conn.commit()
