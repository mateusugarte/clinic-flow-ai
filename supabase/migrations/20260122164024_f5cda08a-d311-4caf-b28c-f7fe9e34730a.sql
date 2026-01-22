-- =====================================================
-- MIGRAÇÃO DE SEGURANÇA: Políticas RLS Restritivas
-- =====================================================

-- 1. Bloquear acesso anônimo explicitamente em todas as tabelas
-- Isso garante que usuários não autenticados não tenham acesso

-- Leads - dados sensíveis de clientes
CREATE POLICY "Block anonymous access to leads" 
ON public.leads 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- Appointments - informações médicas sensíveis
CREATE POLICY "Block anonymous access to appointments" 
ON public.appointments 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- AI Configs - configurações de IA do usuário
CREATE POLICY "Block anonymous access to ai_configs" 
ON public.ai_configs 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- Professionals - dados de profissionais
CREATE POLICY "Block anonymous access to professionals" 
ON public.professionals 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- Services - serviços e preços
CREATE POLICY "Block anonymous access to services" 
ON public.services 
AS RESTRICTIVE
FOR ALL 
TO anon
USING (false);

-- =====================================================
-- 2. Tornar user_id NOT NULL em ai_configs
-- =====================================================

-- Primeiro, deletar registros órfãos (se existirem)
DELETE FROM public.ai_configs WHERE user_id IS NULL;

-- Alterar coluna para NOT NULL
ALTER TABLE public.ai_configs ALTER COLUMN user_id SET NOT NULL;