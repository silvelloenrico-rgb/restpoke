-- Schema RestPoke su D1 (SQLite), tradotto da Supabase/Postgres.
-- uuid -> TEXT (generato dal Worker), numeric -> REAL, text[]/jsonb -> TEXT con JSON.

CREATE TABLE users (
  email TEXT PRIMARY KEY,
  owner TEXT NOT NULL CHECK (owner IN ('Enrico', 'Alessandro')),
  password_hash TEXT NOT NULL
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  quantity REAL NOT NULL DEFAULT 1,
  cost_enrico REAL NOT NULL DEFAULT 0,
  cost_alessandro REAL NOT NULL DEFAULT 0,
  market_price REAL,
  status TEXT NOT NULL DEFAULT 'Stock',
  tags TEXT NOT NULL DEFAULT '[]',
  sale_price REAL,
  purchase_date TEXT,
  sale_date TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  opened_from TEXT REFERENCES items(id),
  opened_date TEXT,
  language TEXT,
  card_set TEXT,
  year INTEGER,
  grader TEXT
);

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  item_id TEXT REFERENCES items(id),
  item_legacy_id TEXT,
  item_name TEXT,
  quantity_sold REAL NOT NULL DEFAULT 1,
  sale_price_total REAL NOT NULL,
  sale_date TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE item_costs (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  item_id TEXT REFERENCES items(id),
  item_name TEXT,
  description TEXT,
  amount REAL NOT NULL DEFAULT 0,
  paid_by TEXT NOT NULL CHECK (paid_by IN ('Enrico', 'Alessandro')),
  date TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE raffles (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  name TEXT NOT NULL,
  cost_enrico REAL NOT NULL DEFAULT 0,
  cost_alessandro REAL NOT NULL DEFAULT 0,
  date TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE personal_items (
  id TEXT PRIMARY KEY,
  legacy_id TEXT UNIQUE,
  owner TEXT NOT NULL CHECK (owner IN ('Enrico', 'Alessandro')),
  name TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 1,
  cost REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Stock',
  tags TEXT NOT NULL DEFAULT '[]',
  sale_price REAL,
  sale_price_total REAL,
  quantity_sold REAL,
  purchase_date TEXT,
  sale_date TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  language TEXT,
  card_set TEXT,
  year INTEGER,
  grader TEXT,
  market_price REAL,
  category TEXT
);

CREATE TABLE push_subscriptions (
  id TEXT PRIMARY KEY,
  user_email TEXT NOT NULL,
  owner TEXT NOT NULL CHECK (owner IN ('Enrico', 'Alessandro')),
  endpoint TEXT NOT NULL UNIQUE,
  subscription TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE options (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  value TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE saved_filters (
  id TEXT PRIMARY KEY,
  page TEXT NOT NULL,
  name TEXT NOT NULL,
  filters TEXT NOT NULL,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX sales_item_id ON sales(item_id);
CREATE INDEX item_costs_item_id ON item_costs(item_id);

CREATE TRIGGER items_updated AFTER UPDATE ON items
BEGIN UPDATE items SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;

CREATE TRIGGER personal_items_updated AFTER UPDATE ON personal_items
BEGIN UPDATE personal_items SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id; END;

-- Costo totale (base + extra) e incasso per articolo, usata dalla dashboard.
CREATE VIEW item_summary AS
SELECT i.*,
  COALESCE(c.extra_enrico, 0) AS extra_enrico,
  COALESCE(c.extra_alessandro, 0) AS extra_alessandro,
  i.cost_enrico + COALESCE(c.extra_enrico, 0) + i.cost_alessandro + COALESCE(c.extra_alessandro, 0) AS total_cost,
  COALESCE(s.revenue, 0) AS revenue,
  COALESCE(s.qty_sold, 0) AS qty_sold
FROM items i
LEFT JOIN (
  SELECT item_id,
    SUM(CASE WHEN paid_by = 'Enrico' THEN amount END) AS extra_enrico,
    SUM(CASE WHEN paid_by = 'Alessandro' THEN amount END) AS extra_alessandro
  FROM item_costs GROUP BY item_id
) c ON c.item_id = i.id
LEFT JOIN (
  SELECT item_id, SUM(sale_price_total) AS revenue, SUM(quantity_sold) AS qty_sold
  FROM sales GROUP BY item_id
) s ON s.item_id = i.id;
