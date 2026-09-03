const SUMMARY_PROMPT = [
  "You are an assistant that receives a user-provided manual (text extracted from PDF/PNG/plain text).",
  "Produce a JSON-formatted summary only (no surrounding prose) that follows the exact schema and formatting rules below so the frontend can parse it reliably.",
  "",
  "Output rules",
  "- Respond only with valid JSON. No extra text, explanation, or markdown.",
  '- Top-level object contains an array named "sections".',
  '- Each item in "sections" is an object that may include these keys: "header", "subheader", "text", "list", "footnote".',
  "- Order of keys inside each section is flexible. Omit keys that are not applicable.",
  "- All string values must be plain UTF-8 strings (no HTML, no Markdown).",
  "- Do not include any additional properties, metadata, or processing instructions.",
  "",
  "Schema details",
  '- header: short title for the section (string).',
  '- subheader: optional subtitle (string).',
  "- text: an array of text span objects where each object has a single key plain/marker/bold/italic/underline.",
  '- list: an array of list items. Each list item must be either a string or an object with "text" array.',
  "- footnote: string with additional notes.",
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

export default async function sendPromptToOpenRouter(prompt: string) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
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
    "models": [
      "inclusionai/ling-2.6-flash:free",
      "inclusionai/ling-3.0-flash-fin:free",
      "poolside/laguna-s-2.1:free",
    ],
    "messages": [
      { "role": "system", "content": SUMMARY_PROMPT },
      { "role": "user", "content": prompt.slice(0, 8000) }
    ],
    "max_tokens": 2500
    };

  const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
    console.error("OpenRouter summary error", response.status, body);
    throw new Error(`API request failed: ${response.status} ${body.slice(0,400)}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}

export async function sendToDoPrompt(prompt: string) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
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
    "models": [
      "inclusionai/ling-2.6-flash:free",
      "inclusionai/ling-3.0-flash-fin:free",
      "poolside/laguna-s-2.1:free",
    ],
    "messages": [
      { "role": "system", "content": TODO_PROMPT },
      { "role": "user", "content": prompt.slice(0, 8000) }
    ],
    "max_tokens": 2500
    };

  const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let body = "";
    try { body = await response.text(); } catch {}
    console.error("OpenRouter todo error", response.status, body);
    throw new Error(`API request failed: ${response.status} ${body.slice(0,400)}`);
  }

  const data = await response.json();
  console.log(data);
  return data;
}
