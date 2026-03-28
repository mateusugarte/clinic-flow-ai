ALTER TABLE public.services ADD COLUMN IF NOT EXISTS has_promotion boolean DEFAULT false;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS promotional_price numeric;