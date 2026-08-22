-- Migration number: 0019_force_password_change

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0
  CHECK (must_change_password IN (0, 1));

