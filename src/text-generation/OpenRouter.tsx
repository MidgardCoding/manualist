export default async function sendPromptToOpenRouter(prompt: string) {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing VITE_OPENROUTER_API_KEY environment variable. " +
      "Please add it to your .env file (e.g. VITE_OPENROUTER_API_KEY=sk-or-v1-...)"
    );
  }
  const url = "https://openrouter.ai/api/v1/chat/completions";
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const payload = {
    "model": "inclusionai/ling-2.6-flash:free",
    "messages": [
      {
        "role": "system",
        "content": "You are an assistant that receives a user-provided manual (text extracted from PDF/PNG/plain text). Produce a JSON-formatted summary only (no surrounding prose) that follows the exact schema and formatting rules below so the frontend can parse it reliably.\n\nOutput rules\n- Respond only with valid JSON. No extra text, explanation, or markdown.\n- Top-level object contains an array named \"sections\".\n- Each item in \"sections\" is an object that may include these keys: \"header\", \"subheader\", \"text\", \"list\", \"footnote\".\n- Order of keys inside each section is flexible. Omit keys that are not applicable.\n- All string values must be plain UTF-8 strings (no HTML, no Markdown).\n- Do not include any additional properties, metadata, or processing instructions.\n\nSchema details\n- header: short title for the section (string).\n- subheader: optional subtitle (string).\n- text: an object that may contain any combination of the following keys. Each key's value is a string. The presence of a key indicates that span should be rendered with that style. The assistant may combine multiple keys in one text object to represent sequential spans; use an array of text objects when multiple sequential spans are needed (see examples).\n  - plain: normal text\n  - marker: text that should be highlighted (yellow)\n  - bold: bold text\n  - italic: italic text\n  - underline: underlined text\n- list: an array of list items. Each list item must be either:\n  - a string (simple bullet), or\n  - an object using the same \"text\" object format described above to represent styled list item content.\n- footnote: string with additional notes or references for the section.\n\nFormatting rules and behavior\n- Use multiple sections to mirror the structure of the manual: e.g., Overview, Safety, Installation, Operation, Troubleshooting, Maintenance, Specifications, Legal.\n- Keep sections concise and focused (8-15 sentences each when applicable).\n- For any step-by-step procedures, prefer using \"list\" with numbered or bulleted items; each item should be a short sentence or phrase.\n- Highlight important warnings or cautions using \"marker\". Emphasize critical terms or names using \"bold\".\n- Use \"italic\" for examples or clarifying remarks and \"underline\" for references to external items (e.g., part numbers, file names).\n- If the source contains explicit footnotes or references, include them in \"footnote\".\n- If content is not present or not applicable, omit that field entirely.\n\nError handling and limits\n- If the input document is empty or unreadable, return a single section with header \"Input Error\" and text containing a single object with plain explaining the issue.\n- Truncate any very long paragraphs into multiple sequential text objects within the same section (do not exceed ~400 characters per text object). Preserve meaning across truncation.\n- Do not output any arrays or objects with null values.\n\nExample outputs (must be followed exactly for structure)\n1) Section with mixed text spans:\n{\n  \"sections\": [\n    {\n      \"header\": \"Quick Start\",\n      \"subheader\": \"Get running in minutes\",\n      \"text\": [\n        {\"plain\": \"Unpack the device and \"},\n        {\"bold\": \"connect the power cable\"},\n        {\"plain\": \" to the base. \"},\n        {\"marker\": \"Do not plug in with wet hands.\"}\n      ],\n      \"footnote\": \"See installation diagram on page 2.\"\n    }\n  ]\n}\n\n2) Section with list items using styled text:\n{\n  \"sections\": [\n    {\n      \"header\": \"Maintenance\",\n      \"list\": [\n        \"Unplug device before cleaning.\",\n        {\"text\": [ {\"plain\": \"Wipe with a \"}, {\"italic\": \"lint-free cloth\"} ]},\n        {\"text\": [ {\"plain\": \"Do not use \"}, {\"bold\": \"solvents\"} ]}\n      ]\n    }\n  ]\n}\n\nTask: Given the manual text below, produce the JSON summary following these rules. Be concise and prioritize clarity; use sections that match typical manual structure. Always output only JSON. Do not write any notes like 'JSON ```{...}```, output clear, one-line JSON only!'"
      },
      {
        "role": "user",
        "content": prompt
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
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
  const headers = {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };
  const payload = {
    "model": "inclusionai/ling-2.6-flash:free",
    "messages": [
      {
        "role": "system",
        "content": "You are an assistant that receives a user-provided manual (text extracted from PDF/PNG/plain text). Produce a JSON-formatted to-do list only (no surrounding prose) that follows the exact schema and formatting rules below so the frontend can parse it reliably.\n\nOutput rules\n- Respond only with valid JSON. No extra text, explanation, or markdown.\n- Top-level object contains an array named \"sections\".\n- Each item in \"sections\" is an object that must use the following structure:\n  {\"text\": [ ... ]}\n  where the array contains text span objects in order.\n- You may use the following text span styles: plain, marker, bold, italic, underline. Each span is an object with a single key and string value.\n- All string values must be plain UTF-8 strings (no HTML, no Markdown).\n- Do not include any additional properties, metadata, or processing instructions.\n- Use gentle, friendly language (e.g., \"Please\", \"We recommend\", \"Quick tip\").\n\nContent rules\n- Produce 8–12 to-do items covering important post-purchase tasks: unboxing, inspection, registering product/warranty, charging/initial setup, safety checks, reading quick start, connecting to network (if applicable), first-run test, configuring preferences, creating backups, and storing documentation.\n- Mark critical safety warnings or actions that must not be skipped with \"marker\".\n- Emphasize important terms (e.g., warranty, serial number) with \"bold\".\n- Use \"italic\" for optional tips or examples and \"underline\" for filenames or part numbers when referenced.\n- Keep each to-do item concise (1–2 short sentences).\n- If a step includes multiple styled spans, use an array of text span objects in order.\n- Do not output empty items or nulls.\n\nError handling\n- If the provided manual text indicates the product is hazardous (contains words like \"danger\", \"hazard\", \"toxic\" in any case), include an early section with a \"marker\" warning: \"Contact support and follow emergency instructions immediately.\"\n- If the product appears to require batteries (words like \"battery\", \"AA\", \"AAA\"), include a step reminding to insert or charge batteries.\n\nExample output (must be followed exactly for structure):\n{\n  \"sections\": [\n    {\n      \"text\": [\n        {\"plain\": \"Unpack and check all parts.\"}\n      ]\n    },\n    {\n      \"text\": [\n        {\"plain\": \"Register your product at \"},\n        {\"underline\": \"example.com/register\"},\n        {\"plain\": \" using the \"},\n        {\"bold\": \"serial number\"}\n      ]\n    }\n  ]\n}\n\nTask: Given the manual text below, produce the JSON to-do list following these rules. Always output only JSON. Do not write any notes like 'JSON ```{...}```', output clear, one-line JSON only!"
      },
      {
        "role": "user",
        "content": prompt
      }
    ]
  };

  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data;
}