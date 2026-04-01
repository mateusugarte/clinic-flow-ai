
-- 1. Add RLS policies to fila_envio
CREATE POLICY "Users can manage their own fila_envio"
  ON public.fila_envio
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Block anonymous access to fila_envio"
  ON public.fila_envio
  FOR ALL
  TO anon
  USING (false);

-- 2. Add storage policies for buckets
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('LOGO', 'images') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('LOGO', 'images') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('LOGO', 'images') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read their own files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id IN ('LOGO', 'images') AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Public read access to images bucket"
  ON storage.objects
  FOR SELECT
  TO anon
  USING (bucket_id = 'images');

-- 3. Fix function search_path
CREATE OR REPLACE FUNCTION public.calcular_data_aviso()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
BEGIN
  IF NEW.seasonal_start_date IS NOT NULL THEN
    NEW.data_aviso := NEW.seasonal_start_date - INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$function$;
