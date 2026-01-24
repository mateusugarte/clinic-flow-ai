-- Add payment_methods column to services table
ALTER TABLE public.services
ADD COLUMN payment_methods text;