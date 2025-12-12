-- Add status_updated_date column to tender1_tenders table
-- This column will track when the tender status was last updated
-- Used for filtering tenders by status update date instead of creation date

-- Add the new column
ALTER TABLE tender1_tenders 
ADD COLUMN IF NOT EXISTS status_updated_date TIMESTAMP WITH TIME ZONE;

-- Set initial value for existing records (use created_at as default)
UPDATE tender1_tenders 
SET status_updated_date = created_at 
WHERE status_updated_date IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_tender1_tenders_status_updated_date 
ON tender1_tenders(status_updated_date DESC);

-- Add comment to document the column
COMMENT ON COLUMN tender1_tenders.status_updated_date IS 'Date when the tender status was last updated. Used for date filtering in Tenders page and Dashboard.';

