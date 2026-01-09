-- Clients table (hybrid: normalized metadata + JSONB content)
CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  site_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  plan_type TEXT DEFAULT 'basic'
);

-- Chat logs table (normalized for analytics)
CREATE TABLE chat_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_chat_logs_client ON chat_logs(client_id);
CREATE INDEX idx_chat_logs_session ON chat_logs(session_id);
CREATE INDEX idx_chat_logs_created ON chat_logs(created_at DESC);
CREATE INDEX idx_clients_active ON clients(active) WHERE active = TRUE;

-- RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to clients"
  ON clients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to chat_logs"
  ON chat_logs FOR ALL
  USING (auth.role() = 'service_role');
