const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const WEBHOOK_URL = "https://aula-n8n.riftvt.easypanel.host/webhook/6aee2506-5133-4c03-bf32-54600c2dc988";

Deno.serve(async (req) => {
  console.log("=== whatsapp-proxy invoked ===");
  console.log("Method:", req.method);
  console.log("URL:", req.url);
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { userID, user_id } = body;

    // We do NOT authenticate with Supabase here.
    // The client must send the user id explicitly.
    const resolvedUserId = typeof userID === "string" ? userID : typeof user_id === "string" ? user_id : null;

    // Build payload
    const payload = {
      user_id: resolvedUserId,
    };

    console.log("Sending to webhook:", JSON.stringify(payload));

    // Forward to webhook without any extra authentication.
    const payloadStr = JSON.stringify(payload);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Forward to n8n webhook
    const response = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers,
      body: payloadStr,
    });

    console.log("Webhook response status:", response.status);

    const responseText = await response.text();
    console.log("Webhook response body:", responseText);
    
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
