import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://aula-n8n.riftvt.easypanel.host/webhook/ff742695-f2f7-4e98-ada8-85b68edf3cee";

Deno.serve(async (req) => {
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

    // Parse request body
    const body = await req.json();
    const { appointmentId, patientName, phone, scheduledAt, serviceName, professionalName, leadId, notes, tags, qualification, lastInteraction } = body;

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
    console.error("Risk proxy error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
