import React from 'react';
import { useAppStore } from '../store';
import { sendToDoPrompt } from '../text-generation/OpenRouter';
import { parseApiResponse, type ParsedContent } from '../utils/parseApiResponse';
import { TextElement } from '../text-generation/TextRenderer';

export default function ToDoSteps() {
  const { extractedText } = useAppStore();
  const [parsedContent, setParsedContent] = React.useState<ParsedContent | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!extractedText.trim()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    sendToDoPrompt(extractedText)
      .then((data) => {
        if (cancelled) return;
        const result = parseApiResponse(data);
        setParsedContent(result);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to fetch todo steps');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [extractedText]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="loading loading-spinner loading-md text-info me-4"></div>
        <p className='text-sm text-muted'>Please wait, we are working on it...</p>
      </div>
    );
  }

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
        <span className="loading loading-spinner loading-md text-info"></span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {parsedContent.sections.map((section, index) => (
        <div key={`todo-${index}`} className="card w-full bg-base-100 border border-base-300">
          <div className="flex float-left p-4">
            <input type="checkbox" className="checkbox checkbox-primary me-4" />
            <div className="card-title text-sm font-semibold peer-checked:bg-base-200 peer-checked:text-base-content">
              Step {index + 1}
            </div>
          </div>
          <div>
            <div className="card-content text-sm peer-checked:bg-base-200 px-4 pb-2">
              {section.text && section.text.length > 0 && (
                <div className="mb-3">
                  {section.text.map((line, i) => (
                    <p key={i} className="mb-1">
                      <TextElement content={line} />
                    </p>
                  ))}
                </div>
              )}
              {section.list && section.list.length > 0 && (
                <ul className="list-disc list-inside mb-3 space-y-1">
                  {section.list.map((item, i) => (
                    <li key={i}>
                      {typeof item === 'string' ? item : (item.text?.map((t, j) => <TextElement key={j} content={t} />) || '')}
                    </li>
                  ))}
                </ul>
              )}
              {section.footnote && (
                <p className="text-xs opacity-60 italic mb-3">{section.footnote}</p>
              )}
            </div>
        </div>
      </div>
      ))}
    </div>
  );
}

