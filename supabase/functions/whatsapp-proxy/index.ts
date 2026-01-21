import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Get auth header (check both casings)
    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);

    let userId = "anonymous";

    // Try to extract user from JWT if present
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (!userError && user) {
          userId = user.id;
          console.log("User authenticated:", userId);
        } else {
          console.log("User auth failed:", userError?.message || "No user");
        }
      } catch (authErr) {
        console.error("Auth error:", authErr);
      }
    }

    // Parse request body
    const body = await req.json();
    const { acao, phone } = body;
    console.log("Action:", acao, "Phone:", phone);

    // Build payload
    const payload = {
      acao,
      user_id: userId,
      ...(phone && { phone }),
    };

    console.log("Sending to webhook:", JSON.stringify(payload));

    // Get webhook secret and create HMAC signature
    const webhookSecret = Deno.env.get("WEBHOOK_SECRET");
    const payloadStr = JSON.stringify(payload);
    
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (webhookSecret) {
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(webhookSecret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(payloadStr)
      );
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
      headers["X-Webhook-Signature"] = signatureHex;
      headers["Authorization"] = `Bearer ${webhookSecret}`;
    }

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
