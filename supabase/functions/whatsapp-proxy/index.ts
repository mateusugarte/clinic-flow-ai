import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Webhook URL from environment variable for security
const WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_WEBHOOK_URL") ?? "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's auth token
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify the JWT and get user claims
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid authentication token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authenticatedUserId = claimsData.claims.sub;

    // Parse request body
    const body = await req.json();
    const { userID, user_id, acao } = body;

    // Resolve the user ID from the request
    const resolvedUserId = typeof userID === "string" ? userID : typeof user_id === "string" ? user_id : null;

    // Verify the authenticated user matches the requested user_id
    if (resolvedUserId && resolvedUserId !== authenticatedUserId) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Cannot perform operations for other users" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build payload - use authenticated user ID
    const payload = {
      user_id: authenticatedUserId,
      acao: acao || null,
    };

    // Get webhook credentials from environment
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
    
    // Try to parse as JSON, otherwise return as text
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    return new Response(JSON.stringify(responseData), {
      status: response.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook proxy error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
