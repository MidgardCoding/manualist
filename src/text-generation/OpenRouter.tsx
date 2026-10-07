import {
  MISTRAL_API_URL,
  MISTRAL_MODEL,
  hasMistralApiKey,
  mistralHeaders,
  normalizeMistralContent,
  toMistralMessages,
} from './mistral';

const SUMMARY_PROMPT = [
  "You are an assistant that receives a user-provided manual (text extracted from PDF/PNG/plain text).",
  "Produce a JSON-formatted summary only (no surrounding prose) that follows the exact schema and formatting rules below so the frontend can parse it reliably.",
  "",
  "Output rules",
  "- Respond only with valid JSON. No extra text, explanation, or markdown.",
  '- Top-level object contains an array named "sections".',
  '- Each item in "sections" is an object that may include these keys: "header", "subheader", "text", "list", "footnote".',
  "- Order of keys inside each section is flexible. Omit keys that are not applicable.",
  "- Never repeat the same key twice inside one section object: combine all paragraph spans into a single \"text\" array and all bullets into a single \"list\" array per section.",
  "- All string values must be plain UTF-8 strings (no HTML, no Markdown).",
  "- Do not include any additional properties, metadata, or processing instructions.",
  "",
  "Schema details",
  '- header: short title for the section (string).',
  '- subheader: optional subtitle (string).',
  "- text: an array of text span objects where each object has a single key plain/marker/bold/italic/underline.",
  '- list: an array of list items. Each list item must be either a string or an object with "text" array.',
  "- footnote: a single plain string with additional notes (never an array).",
  "",
  "Formatting rules",
  "- Use multiple sections to mirror the structure of the manual: Overview, Safety, Installation, Operation, Troubleshooting, Maintenance, Specifications, Legal.",
  "- Keep sections concise and focused (8-15 sentences each when applicable).",
  '- For step-by-step procedures, prefer using "list".',
  '- Highlight warnings using "marker". Emphasize critical terms using "bold".',
  '- Use "italic" for examples and "underline" for references (part numbers, filenames).',
  "",
  "Error handling",
  '- If input is empty, return a single section with header "Input Error" and plain text explaining the issue.',
  "- Do not output null values.",
  "",
  "Task: Given the manual text below, produce the JSON summary following these rules. Always output only JSON.",
].join("\n");

const TODO_PROMPT = [
  "You are an assistant that receives a user-provided manual (text extracted from PDF/PNG/plain text).",
  "Produce a JSON-formatted to-do list only (no surrounding prose) that follows the exact schema and formatting rules below so the frontend can parse it reliably.",
  "",
  "Output rules",
  "- Respond only with valid JSON. No extra text, explanation, or markdown.",
  '- Top-level object contains an array named "sections".',
  '- Each item in "sections" is an object that must use the following structure: {"text": [ ... ]}',
  "  where the array contains text span objects in order.",
  "- You may use the following text span styles: plain, marker, bold, italic, underline. Each span is an object with a single key and string value.",
  "- All string values must be plain UTF-8 strings (no HTML, no Markdown).",
  "- Do not include any additional properties, metadata, or processing instructions.",
  '- Use gentle, friendly language (e.g., "Please", "We recommend", "Quick tip").',
  "",
  "Content rules",
  "- Produce 8-12 to-do items covering important post-purchase tasks: unboxing, inspection, registering product/warranty, charging/initial setup, safety checks, reading quick start, connecting to network (if applicable), first-run test, configuring preferences, creating backups, and storing documentation.",
  '- Mark critical safety warnings or actions that must not be skipped with "marker".',
  '- Emphasize important terms (e.g., warranty, serial number) with "bold".',
  '- Use "italic" for optional tips or examples and "underline" for filenames or part numbers when referenced.',
  "- Keep each to-do item concise (1-2 short sentences).",
  "- If a step includes multiple styled spans, use an array of text span objects in order.",
  "- Do not output empty items or nulls.",
  "",
  "Error handling",
  '- If the provided manual text indicates the product is hazardous (contains words like "danger", "hazard", "toxic" in any case), include an early section with a "marker" warning: "Contact support and follow emergency instructions immediately."',
  '- If the product appears to require batteries (words like "battery", "AA", "AAA"), include a step reminding to insert or charge batteries.',
  "",
  "Example output (must be followed exactly for structure):",
  '{',
  '  "sections": [',
  '    {',
  '      "text": [',
  '        {"plain": "Unpack and check all parts."}',
  '      ]',
  '    },',
  '    {',
  '      "text": [',
  '        {"plain": "Register your product at "},',
  '        {"underline": "example.com/register"},',
  '        {"plain": " using the "},',
  '        {"bold": "serial number"}',
  '      ]',
  '    }',
  '  ]',
  '}',
  "",
  "Task: Given the manual text below, produce the JSON to-do list following these rules. Always output only JSON.",
].join("\n");

const FRAGMENT_PROTOCOL = [
  "Fragment protocol (the manual below may arrive in several numbered fragments):",
  "- The manual is split into fragments labelled \"Fragment 1 of N\", \"Fragment 2 of N\", and so on. You receive fragment 1 first.",
  "- If the fragments received so far are NOT enough to cover the manual well, reply with ONLY this JSON object and nothing else: {\"request_fragment\": 2}",
  "  Replace 2 with the 1-based number (from 1 to N) of the fragment you want next. Request one fragment at a time.",
  "- After each new fragment, either request another fragment the same way or output the final result.",
  "- When you have enough context, output the final result following all rules above.",
  "- Always output only JSON — never explanations, questions, or markdown.",
].join("\n");

const SLICE_CHARS = 6000;
const MAX_SLICES = 6;
const MAX_ROUNDS = 6;

interface ChatMessage {
  role: string;
  content: string;
}

export async function callMistral(messages: ChatMessage[], maxTokens: number, label: string, signal?: AbortSignal) {
  if (!hasMistralApiKey()) {
    throw new Error(
      "Missing MISTRAL_API_KEY environment variable. " +
      "Please add it to your .env file (e.g. MISTRAL_API_KEY=mstrl-...)"
    );
  }
  let response: Response;
  try {
    response = await fetch(MISTRAL_API_URL, {
      method: "POST",
      headers: mistralHeaders(),
      body: JSON.stringify({
        model: MISTRAL_MODEL,
        messages: toMistralMessages(messages),
        max_tokens: maxTokens,
      }),
      signal,
    });
  } catch (err: any) {
    console.error(`Mistral ${label} network error`, err?.message ?? err);
    throw new Error(`Mistral API request failed: ${(err?.message ?? String(err)).slice(0, 400)}`);
  }
  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
    console.error(`Mistral ${label} error`, response.status, body);
    throw new Error(`Mistral API request failed: ${response.status} ${body.slice(0, 400)}`);
  }
  const raw = await response.json();
  const choice = raw?.choices?.[0];
  const content = normalizeMistralContent(choice?.message?.content);
  const data = {
    choices: [
      {
        message: { role: "assistant", content },
        finish_reason: choice?.finish_reason ?? null,
        index: 0,
      },
    ],
  };
  return data;
}

export function getOpenRouterApiKey(): string | undefined {
  return import.meta.env.VITE_OPENROUTER_API_KEY as string | undefined;
}

export function hasOpenRouterApiKey(): boolean {
  return !!getOpenRouterApiKey();
}

function isAbort(err: unknown, signal?: AbortSignal): boolean {
  return (err as any)?.name === 'AbortError' || !!signal?.aborted;
}

async function callModel(messages: ChatMessage[], maxTokens: number, label: string, signal?: AbortSignal) {
  if (hasMistralApiKey()) {
    try {
      return await callMistral(messages, Math.max(maxTokens, 4000), label, signal);
    } catch (err) {
      if (isAbort(err, signal)) throw err;
      if (!hasOpenRouterApiKey()) throw err;
      console.warn(`Mistral ${label} failed, falling back to OpenRouter`, (err as Error)?.message ?? err);
    }
  }
  return callOpenRouter(messages, maxTokens, label, signal);
}

async function callOpenRouter(messages: ChatMessage[], maxTokens: number, label: string, signal?: AbortSignal) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error(
      "Missing VITE_OPENROUTER_API_KEY environment variable. " +
      "Please add it to your .env file (e.g. VITE_OPENROUTER_API_KEY=sk-or-v1-...)"
    );
  }
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const headers: Record<string, string> = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": window.location.origin,
    "X-Title": "Manualist",
  };
  const payload = {
    "model": [
      "dots-studio/dots-3-note-preview:free",
    ],
    "messages": messages,
    "max_tokens": maxTokens,
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
    console.error(`OpenRouter ${label} error`, response.status, body);
    throw new Error(`API request failed: ${response.status} ${body.slice(0, 400)}`);
  }

  const data = await response.json();
  return data;
}

function getReplyContent(data: any): string {
  const fromMessage = data?.choices?.[0]?.message?.content;
  if (typeof fromMessage === "string" && fromMessage.trim()) return fromMessage;
  const fallback = data?.choices?.[0]?.text ?? data?.choices?.[0]?.content;
  if (typeof fallback === "string" && fallback.trim()) return fallback;
  return "";
}

function getReplyReasoning(data: any): string {
  const message = data?.choices?.[0]?.message;
  if (!message || typeof message !== "object") return "";
  const parts: string[] = [];
  const reasoning = (message as any).reasoning;
  if (typeof reasoning === "string") {
    if (reasoning.trim()) parts.push(reasoning.trim());
  } else if (Array.isArray(reasoning)) {
    for (const entry of reasoning) {
      if (typeof entry === "string" && entry.trim()) parts.push(entry.trim());
    }
  }
  const details = (message as any).reasoning_details;
  if (Array.isArray(details)) {
    for (const entry of details) {
      if (typeof entry === "string") {
        if (entry.trim()) parts.push(entry.trim());
      } else if (entry && typeof entry === "object") {
        const text = (entry as any).text ?? (entry as any).summary ?? (entry as any).content;
        if (typeof text === "string" && text.trim()) parts.push(text.trim());
      }
    }
  }
  return parts.join("\n\n");
}

function stripCodeFences(s: string): string {
  return s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/g, "").trim();
}

function detectFragmentRequest(content: string): number | null {
  if (!content) return null;
  const clean = stripCodeFences(content);
  const candidates: string[] = [clean];
  const first = clean.indexOf("{");
  const last = clean.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(clean.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const raw =
          parsed.request_fragment ??
          parsed.need_fragment ??
          parsed.fragment_index ??
          parsed.get_fragment;
        const num = typeof raw === "string" ? Number(raw) : raw;
        if (Number.isInteger(num)) return (num as number) - 1;
      }
    } catch {
    }
  }
  if (clean.length < 300) {
    const match = clean.match(/fragment\s+(\d+)/i);
    if (match) {
      const num = Number(match[1]);
      if (Number.isInteger(num)) return num - 1;
    }
  }
  return null;
}

function sliceManualText(text: string): string[] {
  if (!text) return [""];
  const slices: string[] = [];
  for (let i = 0; i < text.length && slices.length < MAX_SLICES; i += SLICE_CHARS) {
    slices.push(text.slice(i, i + SLICE_CHARS));
  }
  return slices.length > 0 ? slices : [""];
}

function fragmentUserMessage(oneBased: number, total: number, slice: string, totalChars: number, isFirst: boolean): string {
  const start = (oneBased - 1) * SLICE_CHARS + 1;
  const end = Math.min(start + slice.length - 1, Math.max(totalChars, 1));
  const intro = isFirst
    ? `The manual is split into ${total} fragment(s). Here is fragment ${oneBased} of ${total} (characters ${start}-${end} of ${totalChars}):`
    : `Here is fragment ${oneBased} of ${total} (characters ${start}-${end} of ${totalChars}):`;
  return (
    `${intro}\n\n${slice}\n\n` +
    `If you need another fragment, reply with ONLY {"request_fragment": <1-based number>}. Otherwise output the final JSON now.`
  );
}

function invalidFragmentNudge(wantedOneBased: number, total: number, sent: Set<number>): string {
  const alreadySent = [...sent].map((s) => s + 1).join(", ") || "none";
  return (
    `Fragment ${wantedOneBased} is not available (valid fragments are 1-${total}; already sent: ${alreadySent}). ` +
    `Please output the final JSON now using the fragments you have.`
  );
}

async function generateWithFragments(baseSystemPrompt: string, fullText: string, label: string, signal?: AbortSignal) {
  const text = fullText ?? "";
  const slices = sliceManualText(text);
  const total = slices.length;
  const sent = new Set<number>([0]);
  const messages: ChatMessage[] = [
    { role: "system", content: `${baseSystemPrompt}\n\n${FRAGMENT_PROTOCOL}` },
    { role: "user", content: fragmentUserMessage(1, total, slices[0], text.length, true) },
  ];

  let lastData: any = null;
  let rounds = 0;
  while (true) {
    lastData = await callModel(messages, 2500, label, signal);
    rounds += 1;
    const content = getReplyContent(lastData);

    if (!content.trim()) {
      const thinking = getReplyReasoning(lastData);
      if (thinking && rounds <= MAX_ROUNDS) {
        console.log(
          `OpenRouter ${label}: thinking-only reply (no content), asking model to output the result`
        );
        messages.push({ role: "assistant", content: thinking.slice(0, 4000) });
        messages.push({
          role: "user",
          content:
            "That reply contained only thinking and no output. Now output the result: " +
            'either {"request_fragment": <1-based number>} to get another manual fragment, ' +
            "or the final JSON from the task rules. Output only JSON.",
        });
        continue;
      }
      throw new Error("The AI returned an empty response. Please try generating again.");
    }

    const wanted = detectFragmentRequest(content);

    if (wanted === null) {
      return lastData;
    }

    if (rounds >= MAX_ROUNDS) {
      console.log(`OpenRouter ${label}: round budget used, requesting final result`);
      messages.push({ role: "assistant", content });
      messages.push({
        role: "user",
        content: "No more fragments available. Output the final JSON now using the fragments you have.",
      });
      lastData = await callModel(messages, 2500, label, signal);
      return lastData;
    }

    messages.push({ role: "assistant", content });

    if (wanted < 0 || wanted >= total || sent.has(wanted)) {
      messages.push({ role: "user", content: invalidFragmentNudge(wanted + 1, total, sent) });
      continue;
    }

    sent.add(wanted);
    console.log(`OpenRouter ${label}: model requested fragment ${wanted + 1} of ${total}`);
    messages.push({
      role: "user",
      content: fragmentUserMessage(wanted + 1, total, slices[wanted], text.length, false),
    });
  }
}

export default async function sendPromptToOpenRouter(prompt: string, signal?: AbortSignal) {
  return generateWithFragments(SUMMARY_PROMPT, prompt, "summary", signal);
}

export async function sendToDoPrompt(prompt: string, signal?: AbortSignal) {
  return generateWithFragments(TODO_PROMPT, prompt, "todo", signal);
}
