-- Add address column to professionals table
ALTER TABLE public.professionals 
ADD COLUMN address text;

-- Add address column to appointments table
ALTER TABLE public.appointments 
ADD COLUMN address text;