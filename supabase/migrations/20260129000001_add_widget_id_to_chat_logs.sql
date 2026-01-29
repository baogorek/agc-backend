-- Add widget_id column to chat_logs for persona/widget analytics
ALTER TABLE chat_logs ADD COLUMN widget_id TEXT;

-- Index for efficient filtering by widget
CREATE INDEX idx_chat_logs_widget ON chat_logs(widget_id);
