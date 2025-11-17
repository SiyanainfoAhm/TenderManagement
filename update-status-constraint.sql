-- Update status constraint to include all valid status values
-- This fixes the issue where "ready-to-submit" and other statuses are not allowed

-- Drop the old constraint
ALTER TABLE tender1_tenders DROP CONSTRAINT IF EXISTS tender1_tenders_status_check;

-- Add new constraint with all valid status values
ALTER TABLE tender1_tenders 
ADD CONSTRAINT tender1_tenders_status_check 
CHECK (status IN (
  'new',
  'under-study',
  'on-hold',
  'will-bid',
  'pre-bid',
  'wait-for-corrigendum',
  'not-bidding',
  'assigned',
  'in-preparation',
  'ready-to-submit',
  'submitted',
  'under-evaluation',
  'qualified',
  'not-qualified',
  'won',
  'lost'
));

-- Update any existing rows with old status values to new status values
UPDATE tender1_tenders 
SET status = CASE 
  WHEN status = 'study' THEN 'under-study'
  WHEN status = 'corrigendum' THEN 'wait-for-corrigendum'
  ELSE status
END
WHERE status IN ('study', 'corrigendum');

