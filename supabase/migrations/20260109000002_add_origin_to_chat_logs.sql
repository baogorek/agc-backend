-- Add origin column to chat_logs for traceability
ALTER TABLE chat_logs ADD COLUMN origin TEXT;
