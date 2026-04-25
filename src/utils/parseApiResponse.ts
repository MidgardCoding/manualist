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

export function parseApiResponse(jsonData: JsonResponse): ParsedContent {
  const messageContent = jsonData.choices[0]?.message.content;
  if (!messageContent) {
    throw new Error('No message content found');
  }

  // Remove code fences if present
  let jsonString = messageContent.replace(/^```json\s*/g, '').replace(/\s*```$/g, '').trim();

  // Try to find the outermost JSON structure (object or array)
  const firstBrace = jsonString.indexOf('{');
  const firstBracket = jsonString.indexOf('[');
  let extracted = '';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    // Likely an object, find matching last }
    const lastBrace = jsonString.lastIndexOf('}');
    extracted = jsonString.slice(firstBrace, lastBrace + 1);
  } else if (firstBracket !== -1) {
    // Likely an array, find matching last ]
    const lastBracket = jsonString.lastIndexOf(']');
    extracted = jsonString.slice(firstBracket, lastBracket + 1);
  } else {
    throw new Error('No JSON object or array found in response');
  }

  const parsedJson = JSON.parse(extracted);

  if (parsedJson.sections) {
    return { sections: parsedJson.sections };
  } else if (Array.isArray(parsedJson)) {
    // Handle legacy top-level array by wrapping each item into a section
    return {
      sections: parsedJson.map((item: unknown) => {
        if (typeof item === 'string') {
          return { text: [{ plain: item }] };
        }
        if (item && typeof item === 'object') {
          if ('text' in item && Array.isArray((item as Record<string, unknown>).text)) {
            return item as Section;
          }
          // Convert any other object shape to text spans
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

