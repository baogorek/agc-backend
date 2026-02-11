CREATE TABLE chat_metrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  widget_id TEXT,
  response_time_ms INTEGER NOT NULL,
  vertex_attempts INTEGER NOT NULL DEFAULT 1,
  vertex_status INTEGER,
  success BOOLEAN NOT NULL,
  error_type TEXT,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chat_metrics_client ON chat_metrics(client_id);
CREATE INDEX idx_chat_metrics_created ON chat_metrics(created_at DESC);
CREATE INDEX idx_chat_metrics_success ON chat_metrics(success) WHERE success = FALSE;

ALTER TABLE chat_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access to chat_metrics"
  ON chat_metrics FOR ALL
  USING (auth.role() = 'service_role');
