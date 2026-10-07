// Manualist Edge Function: chat
// Server-side chat proxy — same credit gate pattern as generate.
// Deploy with: supabase functions deploy chat
// Client contract (POST JSON): { messages: {role,content}[], max_tokens?: number }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "ministral-8b-2512";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "dots-studio/dots-3-note-preview:free";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { status: 405, headers: cors });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user }, error: userErr } = await supabase.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: cors });
    }
    const body = await req.json().catch(() => ({}));
    const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
    if (!messages.length) {
      return new Response(JSON.stringify({ error: "Empty messages" }), { status: 400, headers: cors });
    }

    const { error: deductErr } = await supabase.rpc("deduct_credits", { p_amount: 1 });
    if (deductErr) {
      return new Response(JSON.stringify({ error: deductErr.message }), { status: 402, headers: cors });
    }

    try {
      // Priority: Mistral first, OpenRouter as fallback (same order as client).
      const mistralKey = Deno.env.get("MISTRAL_API_KEY");
      const orKey = Deno.env.get("OPENROUTER_API_KEY");
      let payload: unknown;
      let mistralErr: unknown = null;
      if (mistralKey) {
        try {
          const r = await fetch(MISTRAL_URL, {
            method: "POST",
            headers: { Authorization: `Bearer ${mistralKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: MISTRAL_MODEL, messages, max_tokens: 2000 }),
          });
          if (!r.ok) throw new Error(`Mistral ${r.status} ${(await r.text()).slice(0, 300)}`);
          payload = await r.json();
        } catch (e) {
          mistralErr = e;
          console.warn("Mistral chat failed, trying OpenRouter fallback", (e as Error)?.message ?? e);
        }
      }
      if (payload === undefined) {
        if (!orKey) {
          if (mistralErr) throw mistralErr;
          throw new Error("Chat is not configured (set MISTRAL_API_KEY secret)");
        }
        const r = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json", "X-Title": "Manualist" },
          body: JSON.stringify({ model: OPENROUTER_MODEL, messages, max_tokens: 2000 }),
        });
        if (!r.ok) throw new Error(`OpenRouter ${r.status} ${(await r.text()).slice(0, 300)}`);
        payload = await r.json();
      }
      return new Response(JSON.stringify(payload), { headers: { ...cors, "Content-Type": "application/json" } });
    } catch (llmErr) {
      await supabase.rpc("refund_credits", { p_amount: 1 });
      throw llmErr;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Chat failed";
    return new Response(JSON.stringify({ error: msg.slice(0, 500) }), { status: 500, headers: cors });
  }
});
