
-- Table to store the user's ficha template config (which questions are enabled)
CREATE TABLE public.ficha_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  perguntas_ativas jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ficha_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to ficha_config" ON public.ficha_config AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Users can manage their own ficha_config" ON public.ficha_config FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Table to store filled anamnesis per lead
CREATE TABLE public.ficha_respostas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  respostas jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lead_id)
);

ALTER TABLE public.ficha_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Block anonymous access to ficha_respostas" ON public.ficha_respostas AS RESTRICTIVE FOR ALL TO anon USING (false);
CREATE POLICY "Users can manage their own ficha_respostas" ON public.ficha_respostas FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
