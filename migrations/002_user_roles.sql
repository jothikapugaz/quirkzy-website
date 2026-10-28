ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'customer';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_allowed') THEN
    ALTER TABLE users ADD CONSTRAINT users_role_allowed CHECK (role IN ('customer','admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC);
