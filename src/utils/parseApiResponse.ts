export interface JsonResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

export interface Section {
  header?: string;
  subheader?: string;
  text?: { plain?: string; marker?: string; bold?: string; italic?: string; underline?: string }[];
  list?: (string | { text?: { plain?: string; marker?: string; bold?: string; italic?: string; underline?: string }[]; plain?: string })[];
  footnote?: string;
}

export interface ParsedContent {
  sections: Section[];
}

export function getSectionId(header: string | undefined, index: number): string {
  const fallback = `section-${index}`;
  if (!header || !header.trim()) return fallback;
  const slug = header
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || fallback;
  return `section-${index}-${slug}`;
}

function extractMessageContent(jsonData: unknown): string {
  if (!jsonData || typeof jsonData !== 'object') {
    throw new Error('No message content found');
  }

  const choices = (jsonData as Record<string, unknown>).choices;
  if (Array.isArray(choices) && choices.length > 0) {
    const first = choices[0] as Record<string, unknown> | undefined;
    const message = first?.message as Record<string, unknown> | undefined;
    if (message && typeof message.content === 'string' && message.content.trim()) {
      return message.content;
    }
    // fallback: some providers return text in `text` or `content` directly on choice
    if (first && typeof first.text === 'string' && first.text.trim()) {
      return first.text;
    }
    if (first && typeof first.content === 'string' && (first.content as string).trim()) {
      return first.content as string;
    }
  }

  throw new Error('No message content found in response');
}

function repairJsonString(str: string): string {
  let s = str;
  // Remove trailing commas before } or ]
  s = s.replace(/,\s*([}\]])/g, '$1');
  // Fix double closing braces before comma or bracket: "}} , " or "}} ]" -> "} ,"
  // This handles the specific bug: {"plain": "..."}}, -> should be {"plain": "..."},
  s = s.replace(/}\s*}\s*,/g, '},');
  s = s.replace(/}\s*}\s*]/g, '}]');
  // Fix stray comma after opening bracket
  s = s.replace(/\[\s*,/g, '[');
  // Fix missing comma between objects in array (heuristic: "} {")
  s = s.replace(/}\s*{/g, '},{');
  // Fix missing comma between array elements where one ends with " and next starts with "
  // not needed for this case
  return s;
}

function autoCloseJson(str: string): string {
  // If JSON is truncated, try to close open strings, arrays, objects
  let s = str.trim();
  // If ends with an unclosed string, close it
  // Count quotes ignoring escaped ones to know if we're inside a string
  let inString = false;
  let escape = false;
  const stack: string[] = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\') {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '{' || ch === '[') {
      stack.push(ch);
    } else if (ch === '}') {
      // pop matching {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j] === '{') {
          stack.splice(j, 1);
          break;
        }
      }
    } else if (ch === ']') {
      for (let j = stack.length - 1; j >= 0; j--) {
        if (stack[j] === '[') {
          stack.splice(j, 1);
          break;
        }
      }
    }
  }

  // If we're still inside a string, close it
  if (inString) {
    // Check if last char is not already a quote, add closing quote
    // Also need to escape any trailing backslash
    if (s.endsWith('\\')) s = s.slice(0, -1);
    s += '"';
  }

  // Close remaining stack in reverse
  while (stack.length > 0) {
    const open = stack.pop()!;
    if (open === '{') s += '}';
    else if (open === '[') s += ']';
  }

  return s;
}

function tryParseWithRepair(extracted: string): unknown {
  const attempts: string[] = [];
  attempts.push(extracted);
  attempts.push(repairJsonString(extracted));
  attempts.push(autoCloseJson(repairJsonString(extracted)));
  attempts.push(autoCloseJson(extracted));

  // Also try slicing to last valid closing brace if truncated
  // Find last occurrence of "},", try to truncate there and close
  const lastValidIdx = extracted.lastIndexOf('},');
  if (lastValidIdx !== -1 && extracted.length - lastValidIdx > 200) {
    // likely truncated, try truncating to last complete element
    const truncated = extracted.slice(0, lastValidIdx + 1);
    attempts.push(autoCloseJson(repairJsonString(truncated + ']'))) ;
    // try closing as object with sections
    attempts.push(autoCloseJson(repairJsonString(truncated + ']}')));
  }

  // Ultimate fallback: try to extract sections array via regex and rebuild
  let lastError: Error | null = null;
  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch (e) {
      lastError = e as Error;
    }
  }

  // Last resort: try to salvage by extracting all complete sections via balancing
  try {
    const salvaged = salvageSections(extracted);
    if (salvaged.sections.length > 0) return salvaged;
  } catch {}

  throw lastError ?? new Error('JSON parse failed after repairs');
}

function salvageSections(jsonString: string): { sections: Section[] } {
  // Extract header/title and text blocks via regex as fallback when JSON is badly broken
  // Find all occurrences of {"header": ... } complete objects by balancing braces
  const sections: Section[] = [];
  const sectionsIdx = jsonString.indexOf('"sections"');
  if (sectionsIdx === -1) throw new Error('No sections key');
  let arrayStart = jsonString.indexOf('[', sectionsIdx);
  if (arrayStart === -1) throw new Error('No array start');

  let depth = 0;
  let inString = false;
  let escape = false;
  let start = -1;
  for (let i = arrayStart; i < jsonString.length; i++) {
    const ch = jsonString[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\') { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') {
      if (depth === 1 && start === -1) start = i;
      depth++;
      if (ch === '{' && i > arrayStart) {
        // count object depth separately? Use simple stack for objects
      }
    } else if (ch === '}') {
      depth--;
      if (depth === 1 && start !== -1) {
        // end of a section object
        const objStr = jsonString.slice(start, i + 1);
        try {
          const obj = JSON.parse(repairJsonString(objStr));
          sections.push(obj);
        } catch {
          // try auto close
          try {
            const obj = JSON.parse(autoCloseJson(repairJsonString(objStr)));
            sections.push(obj);
          } catch {}
        }
        start = -1;
      }
      if (depth <= 0) break; // end of sections array
    } else if (ch === '[') {
      if (depth >= 1) depth++;
    } else if (ch === ']') {
      depth--;
      if (depth <= 0) break;
    }
  }

  // Handle depth tracking for array correctly: better to track separate stack
  // If our simple depth logic failed to collect, try alternative: extract via matching braces
  if (sections.length === 0) {
    // fallback: find all {"header": ... } blocks with regex and attempt parse individually
    const headerRegex = /\{\s*"header"\s*:/g;
    let match: RegExpExecArray | null;
    const indices: number[] = [];
    while ((match = headerRegex.exec(jsonString)) !== null) {
      indices.push(match.index);
    }
    for (let i = 0; i < indices.length; i++) {
      const s = indices[i];
      const e = i + 1 < indices.length ? indices[i + 1] : jsonString.length;
      // find balanced braces for this section
      let d = 0;
      let inS = false;
      let esc = false;
      let end = -1;
      for (let j = s; j < e + 500; j++) {
        if (j >= jsonString.length) break;
        const c = jsonString[j];
        if (esc) { esc = false; continue; }
        if (c === '\\') { esc = true; continue; }
        if (c === '"') { inS = !inS; continue; }
        if (inS) continue;
        if (c === '{') d++;
        else if (c === '}') {
          d--;
          if (d === 0) { end = j; break; }
        }
      }
      if (end !== -1) {
        const objStr = jsonString.slice(s, end + 1);
        try {
          const obj = JSON.parse(repairJsonString(objStr));
          sections.push(obj);
        } catch {}
      }
    }
  }

  if (sections.length === 0) throw new Error('No sections salvaged');
  return { sections };
}

export function parseApiResponse(jsonData: JsonResponse): ParsedContent {
  const messageContent = extractMessageContent(jsonData);
  if (!messageContent) {
    throw new Error('No message content found');
  }

  // Remove code fences if present
  let jsonString = messageContent.replace(/^```json\s*/g, '').replace(/\s*```$/g, '').trim();
  // Also handle ``` without json tag
  jsonString = jsonString.replace(/^```\s*/g, '').replace(/\s*```$/g, '').trim();

  // Try to find the outermost JSON structure (object or array)
  const firstBrace = jsonString.indexOf('{');
  const firstBracket = jsonString.indexOf('[');
  let extracted = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = jsonString.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      extracted = jsonString.slice(firstBrace, lastBrace + 1);
    } else {
      // truncated, take from first brace to end
      extracted = jsonString.slice(firstBrace);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = jsonString.lastIndexOf(']');
    if (lastBracket !== -1) {
      extracted = jsonString.slice(firstBracket, lastBracket + 1);
    } else {
      extracted = jsonString.slice(firstBracket);
    }
  } else {
    throw new Error('No JSON object or array found in response');
  }

  let parsedJson: any;
  try {
    parsedJson = JSON.parse(extracted);
  } catch {
    parsedJson = tryParseWithRepair(extracted);
  }

  if (parsedJson.sections) {
    // Validate sections is array
    if (!Array.isArray(parsedJson.sections)) throw new Error('Sections is not an array');
    return { sections: parsedJson.sections };
  } else if (Array.isArray(parsedJson)) {
    return {
      sections: parsedJson.map((item: unknown) => {
        if (typeof item === 'string') {
          return { text: [{ plain: item }] };
        }
        if (item && typeof item === 'object') {
          if ('text' in item && Array.isArray((item as Record<string, unknown>).text)) {
            return item as Section;
          }
          return {
            text: Object.entries(item as Record<string, string>).map(([key, value]) => ({
              [key]: value,
            })),
          } as Section;
        }
        return { text: [{ plain: String(item) }] };
      }),
    };
  } else {
    throw new Error('No sections found in JSON');
  }
}
