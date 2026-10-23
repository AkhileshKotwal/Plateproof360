CREATE TABLE dishes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE ingredients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE ingredient_allergens (
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  allergen_tag TEXT NOT NULL,
  PRIMARY KEY (ingredient_id, allergen_tag)
);

CREATE TABLE dish_ingredients (
  dish_id INTEGER NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  PRIMARY KEY (dish_id, ingredient_id)
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number INTEGER NOT NULL UNIQUE,
  dish_id INTEGER NOT NULL REFERENCES dishes(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cook_temp_c REAL NOT NULL CHECK (cook_temp_c >= 0),
  cook_time_min INTEGER NOT NULL CHECK (cook_time_min > 0),
  hygiene_ok INTEGER NOT NULL CHECK (hygiene_ok IN (0, 1))
);

CREATE TABLE complaints (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  issue_type TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incidents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'Fixed', 'Verified', 'Closed')),
  source_ref TEXT NOT NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE incident_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  incident_id INTEGER NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  actor_role TEXT NOT NULL DEFAULT 'system',
  note TEXT,
  proof_url TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE checklist_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  checklist_item_id INTEGER NOT NULL REFERENCES checklist_items(id) ON DELETE CASCADE,
  checked_by TEXT NOT NULL,
  passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
  checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE storage_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  expiry_date TEXT NOT NULL,
  temp_limit_c REAL NOT NULL,
  current_temp_c REAL NOT NULL
);
