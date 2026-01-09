-- Add allowed_origins column for origin validation
ALTER TABLE clients ADD COLUMN allowed_origins TEXT[] DEFAULT '{}';

-- Update existing client with allowed origins
UPDATE clients
SET allowed_origins = ARRAY['https://localmobilevet.com']
WHERE id = 'localmobilevet';
