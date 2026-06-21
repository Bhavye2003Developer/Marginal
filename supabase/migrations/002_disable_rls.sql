-- Single-user app with no auth — disable RLS so the publishable (anon) key
-- can read and write all tables without needing Row Level Security policies.
ALTER TABLE articles    DISABLE ROW LEVEL SECURITY;
ALTER TABLE highlights  DISABLE ROW LEVEL SECURITY;
ALTER TABLE collections DISABLE ROW LEVEL SECURITY;
