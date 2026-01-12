-- Table for storing AI Readiness Audit requests from the website form
CREATE TABLE audit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name TEXT NOT NULL,
  website TEXT NOT NULL,
  email TEXT NOT NULL,
  industry TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying by date
CREATE INDEX idx_audit_requests_created_at ON audit_requests(created_at DESC);

-- RLS: Only service role can access (Edge Functions use service role)
ALTER TABLE audit_requests ENABLE ROW LEVEL SECURITY;
