import { supabase } from "@/integrations/supabase/client";

// Supabase project configuration
const SUPABASE_URL = "https://qdsvbhtaldyjtfmujmyt.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFkc3ZiaHRhbGR5anRmbXVqbXl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5Nzc5MzksImV4cCI6MjA4MzU1MzkzOX0.hIQs0Ql2qHBrwJlJW54n22WJtjkA27_6maBLt3kyqik";

export interface EdgeFunctionResponse<T = unknown> {
  data: T;
  status: number;
}

export class EdgeFunctionError extends Error {
  status: number;
  data: unknown;
  
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Invokes a Supabase Edge Function with proper authentication and headers.
 * 
 * @param functionName - Name of the edge function (e.g., "whatsapp-proxy")
 * @param body - Request body to send
 * @returns Promise with the response data
 * @throws EdgeFunctionError if the request fails
 */
export async function invokeEdgeFunction<T = unknown>(
  functionName: string,
  body: Record<string, unknown>
): Promise<EdgeFunctionResponse<T>> {
  // Get the current session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError) {
    console.error("[EdgeFunction] Session error:", sessionError.message);
    throw new EdgeFunctionError("Erro ao obter sessão", 401);
  }
  
  if (!session?.access_token) {
    console.error("[EdgeFunction] No access token found");
    throw new EdgeFunctionError("Sessão expirada. Faça login novamente.", 401);
  }
  
  const url = `${SUPABASE_URL}/functions/v1/${functionName}`;
  
  console.log(`[EdgeFunction] Calling ${functionName}...`);
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
        "apikey": SUPABASE_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
    });
    
    const responseText = await response.text();
    console.log(`[EdgeFunction] ${functionName} responded with status ${response.status}`);
    
    // Try to parse as JSON
    let data: T;
    try {
      data = JSON.parse(responseText) as T;
    } catch {
      data = responseText as unknown as T;
    }
    
    if (!response.ok) {
      const errorMessage = typeof data === "object" && data !== null && "error" in data 
        ? String((data as { error: unknown }).error)
        : `Erro ${response.status}`;
      
      console.error(`[EdgeFunction] ${functionName} error:`, errorMessage);
      throw new EdgeFunctionError(errorMessage, response.status, data);
    }
    
    return { data, status: response.status };
  } catch (error) {
    if (error instanceof EdgeFunctionError) {
      throw error;
    }
    
    console.error(`[EdgeFunction] Network error for ${functionName}:`, error);
    throw new EdgeFunctionError(
      "Erro de conexão. Verifique sua internet.",
      0,
      error
    );
  }
}
