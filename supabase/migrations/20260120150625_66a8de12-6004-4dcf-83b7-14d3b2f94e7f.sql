-- Add WhatsApp connection status column to ai_configs
ALTER TABLE public.ai_configs 
ADD COLUMN IF NOT EXISTS whatsapp_connected boolean DEFAULT false;