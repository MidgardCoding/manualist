import React from 'react';
import { type JsonResponse, type Section, parseApiResponse, getSectionId } from '../utils/parseApiResponse';
import { TextElement } from '../text-generation/TextRenderer';

interface TableOfContentsProps {
  apiResponse: JsonResponse;
}

function getFirstTextContent(section: Section): Section['text'] extends (infer U)[] | undefined ? U : never {
  if (section.text && section.text.length > 0) {
    return section.text[0] as any;
  }
  return null as any;
}

export default function TableOfContents({ apiResponse }: TableOfContentsProps) {
  const [parsedContent, setParsedContent] = React.useState<{ sections: Section[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const scrollToSection = (header: string | undefined, index: number) => {
    const id = getSectionId(header, index);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // brief highlight for feedback
      el.classList.add('ring-2', 'ring-warning', 'ring-offset-2');
      setTimeout(() => el.classList.remove('ring-2', 'ring-warning', 'ring-offset-2'), 1200);
    }
  };

  React.useEffect(() => {
    try {
      const result = parseApiResponse(apiResponse);
      setParsedContent(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing error');
      setParsedContent(null);
    }
  }, [apiResponse]);

  if (error) {
    return (
      <div className="alert alert-error alert-sm">
        <span>Error: {error}</span>
      </div>
    );
  }

  if (!parsedContent) {
    return (
      <div className="flex items-center justify-center py-8">
        <span className="loading loading-spinner loading-md"></span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parsedContent.sections.map((section, index) => {
        const firstText = getFirstTextContent(section);
        const hasSubheader = !!section.subheader?.trim();
        const hasFirstText = !!firstText && Object.keys(firstText as object).length > 0;
        return (
          <div key={`toc-${index}`} className="collapse bg-base-100 border border-base-300">
            <input type="checkbox" className="peer" />
            <div className="collapse-title text-sm font-semibold peer-checked:bg-base-200 peer-checked:text-base-content">
              {section.header || `Section ${index + 1}`}
            </div>
            <div className="collapse-content text-sm peer-checked:bg-base-200">
              {hasSubheader && <p className="mb-2 font-medium opacity-80">{section.subheader}</p>}
              {hasFirstText ? (
                <p className="mb-3 opacity-70 text-xs leading-relaxed line-clamp-3">
                  <TextElement content={firstText as any} />
                </p>
              ) : !hasSubheader ? (
                <p className="mb-3 opacity-50 italic">No description</p>
              ) : null}
              <button
                type="button"
                onClick={() => scrollToSection(section.header, index)}
                className="btn btn-info btn-sm w-full"
                aria-label={`Go to ${section.header || `Section ${index + 1}`} in Quick Summary`}
              >
                Read More
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

