// Manualist Edge Function: generate
// Holds MISTRAL_API_KEY / OPENROUTER_API_KEY server-side so browser builds
// never ship secrets. Deploy with:
//   supabase secrets set MISTRAL_API_KEY=... OPENROUTER_API_KEY=...
//   supabase functions deploy generate
//
// Client contract (POST JSON): { kind: "summary" | "todo", text: string }
// Server: verifies JWT, deducts 1 credit via deduct_credits(), calls the LLM,
// refunds via refund_credits() on failure, returns the LLM JSON payload.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = "ministral-8b-2512";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

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
    const kind = body.kind === "todo" ? "todo" : "summary";
    const text = String(body.text ?? "").slice(0, 36000);
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Empty text" }), { status: 400, headers: cors });
    }

    // Deduct BEFORE the LLM call (server-side gate — cannot be bypassed).
    const { error: deductErr } = await supabase.rpc("deduct_credits", { p_amount: 1 });
    if (deductErr) {
      return new Response(JSON.stringify({ error: deductErr.message }), { status: 402, headers: cors });
    }

    try {
      const system = kind === "todo"
        ? "You are an assistant that receives a user-provided manual. Produce a JSON-formatted to-do list only."
        : "You are an assistant that receives a user-provided manual. Produce a JSON-formatted summary only.";
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
            body: JSON.stringify({ model: MISTRAL_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: text }], max_tokens: 4000 }),
          });
          if (!r.ok) throw new Error(`Mistral ${r.status} ${(await r.text()).slice(0, 300)}`);
          payload = await r.json();
        } catch (e) {
          mistralErr = e;
          console.warn("Mistral generate failed, trying OpenRouter fallback", (e as Error)?.message ?? e);
        }
      }
      if (payload === undefined) {
        if (!orKey) {
          if (mistralErr) throw mistralErr;
          throw new Error("No LLM key configured (set MISTRAL_API_KEY secret)");
        }
        const r = await fetch(OPENROUTER_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${orKey}`, "Content-Type": "application/json", "X-Title": "Manualist" },
          body: JSON.stringify({ model: "dots-studio/dots-3-note-preview:free", messages: [{ role: "system", content: system }, { role: "user", content: text }], max_tokens: 2500 }),
        });
        if (!r.ok) throw new Error(`OpenRouter ${r.status} ${(await r.text()).slice(0, 300)}`);
        payload = await r.json();
      }
      return new Response(JSON.stringify(payload), { headers: { ...cors, "Content-Type": "application/json" } });
    } catch (llmErr) {
      // LLM failed after deduct — refund.
      await supabase.rpc("refund_credits", { p_amount: 1 });
      throw llmErr;
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generate failed";
    return new Response(JSON.stringify({ error: msg.slice(0, 500) }), { status: 500, headers: cors });
  }
});
