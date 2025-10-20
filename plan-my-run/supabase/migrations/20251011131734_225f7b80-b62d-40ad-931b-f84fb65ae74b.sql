-- Add new columns for structured workout descriptions
ALTER TABLE public.workouts
ADD COLUMN warmup TEXT,
ADD COLUMN main_set TEXT,
ADD COLUMN cooldown TEXT;

-- Update existing workouts to split description into sections
-- (This is a one-time migration for existing data)
UPDATE public.workouts
SET 
  warmup = CASE 
    WHEN type = 'rest' THEN 'Complete rest day for recovery'
    ELSE 'Light warm-up and dynamic stretches'
  END,
  main_set = description,
  cooldown = CASE
    WHEN type = 'rest' THEN NULL
    ELSE 'Cool down with easy movement and static stretching'
  END
WHERE warmup IS NULL;