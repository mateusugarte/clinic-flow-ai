import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// CORS headers - allow Lovable, localhost, and any HTTPS origin (production)
const getCorsHeaders = (origin: string | null) => {
  const isAllowed = origin && (
    origin.includes(".lovable.app") ||
    origin.includes("localhost") ||
    origin.startsWith("https://")
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed && origin ? origin : "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

// Input validation schema
// Supports two formats:
// 1) Legacy/minimal (top-level fields)
// 2) "Como antes" payload: { agendamento: { ... } }
const confirmationMinimalSchema = z.object({
  appointmentId: z.string().uuid(),
  phone: z.string().min(10).max(20),
  patientName: z.string().min(1).max(100),
  scheduledAt: z.string(),
  serviceName: z.string().min(1).max(100),
});

const agendamentoSchema = z
  .object({
    id: z.string().uuid(),
    phone: z.string().min(10).max(20),
    // allow both PT/EN variants
    patientName: z.string().min(1).max(100).optional(),
    nome: z.string().min(1).max(100).optional(),
    scheduledAt: z.string().optional(),
    scheduled_at: z.string().optional(),
    serviceName: z.string().min(1).max(100).optional(),
    service_name: z.string().min(1).max(100).optional(),
    professionalName: z.string().optional().nullable(),
    professional_name: z.string().optional().nullable(),
    duracao: z.number().optional().nullable(),
    price: z.number().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .passthrough();

const confirmationAgendamentoSchema = z
  .object({
    agendamento: agendamentoSchema,
  })
  .passthrough();

const confirmationSchema = z.union([confirmationMinimalSchema, confirmationAgendamentoSchema]);

// Webhook URL from environment variable for security
const WEBHOOK_URL = Deno.env.get("N8N_CONFIRMATION_WEBHOOK_URL") ?? "";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Parse and validate request body
    const rawBody = await req.json();
    const parseResult = confirmationSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize input into a single appointment-like shape
    const normalized = (() => {
      if ("agendamento" in parseResult.data) {
        const a = parseResult.data.agendamento;
        const patientName = a.patientName ?? a.nome ?? "Paciente";
        const scheduledAt = a.scheduledAt ?? a.scheduled_at ?? "";
        const serviceName = a.serviceName ?? a.service_name ?? "Consulta";
        const professionalName = a.professionalName ?? a.professional_name ?? "";

        return {
          appointmentId: a.id,
          phone: a.phone,
          patientName,
          scheduledAt,
          serviceName,
          professionalName,
          duracao: a.duracao ?? null,
          price: a.price ?? null,
          notes: a.notes ?? null,
        };
      }

      // minimal
      return {
        appointmentId: parseResult.data.appointmentId,
        phone: parseResult.data.phone,
        patientName: parseResult.data.patientName,
        scheduledAt: parseResult.data.scheduledAt,
        serviceName: parseResult.data.serviceName,
        professionalName: "",
        duracao: null,
        price: null,
        notes: null,
      };
    })();

    // Payload "como antes": enviar os dados do agendamento dentro de 'agendamento'
    // (Mantém também variações de chaves para compatibilidade no n8n.)
    const payload = {
      user_id: userId,
      agendamento: {
        id: normalized.appointmentId,
        appointmentId: normalized.appointmentId,
        appointment_id: normalized.appointmentId,
        phone: normalized.phone,
        patientName: normalized.patientName,
        nome: normalized.patientName,
        patient_name: normalized.patientName,
        scheduledAt: normalized.scheduledAt,
        scheduled_at: normalized.scheduledAt,
        serviceName: normalized.serviceName,
        service_name: normalized.serviceName,
        professionalName: normalized.professionalName,
        professional_name: normalized.professionalName,
        duracao: normalized.duracao,
        price: normalized.price,
        notes: normalized.notes,
      },
    };

    // Get webhook credentials from environment (same as whatsapp-proxy)
    const webhookUsername = (Deno.env.get("N8N_WEBHOOK_USERNAME") ?? "webhook_api").trim();
    const webhookPassword = (Deno.env.get("N8N_WEBHOOK_PASSWORD") ?? "").trim();

    // Create Basic Auth header
    const basicAuth = btoa(`${webhookUsername}:${webhookPassword}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Basic ${basicAuth}`,
    };

    // Check if webhook URL is configured
    if (!WEBHOOK_URL) {
      console.error("[confirmation-proxy] N8N_CONFIRMATION_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ error: "Webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Forward to n8n webhook
    console.log("[confirmation-proxy] Forwarding request to n8n...");
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    console.log("[confirmation-proxy] n8n response status:", response.status);
    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Confirmation proxy error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
