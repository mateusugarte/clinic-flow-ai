import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  "https://id-preview--966a54dc-5453-47ad-9053-c67781d9699a.lovable.app",
  "http://localhost:5173",
  "http://localhost:8080",
];

const getCorsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// Input validation schema
const riskPayloadSchema = z.object({
  appointmentId: z.string().uuid(),
  patientName: z.string().min(1).max(100),
  phone: z.string().min(10).max(20),
  scheduledAt: z.string(),
  serviceName: z.string().min(1).max(100),
  professionalName: z.string().min(1).max(100),
  leadId: z.string().uuid(),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).nullable().optional(),
  qualification: z.string().max(50).nullable().optional(),
  lastInteraction: z.string().nullable().optional(),
});

// Webhook URL from environment variable for security
const WEBHOOK_URL = Deno.env.get("N8N_RISK_WEBHOOK_URL") ?? "";

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;

    // Parse and validate request body
    const rawBody = await req.json();
    const parseResult = riskPayloadSchema.safeParse(rawBody);
    
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({ error: "Invalid input", details: parseResult.error.issues }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { appointmentId, patientName, phone, scheduledAt, serviceName, professionalName, leadId, notes, tags, qualification, lastInteraction } = parseResult.data;

    // Build payload
    const payload = {
      user_id: userId,
      appointment_id: appointmentId,
      patient_name: patientName,
      phone,
      scheduled_at: scheduledAt,
      service_name: serviceName,
      professional_name: professionalName,
      lead_id: leadId,
      notes,
      tags,
      qualification,
      last_interaction: lastInteraction,
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

    // Forward to n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

    return new Response(responseText, {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Risk proxy error:", error instanceof Error ? error.message : "Unknown error");
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
