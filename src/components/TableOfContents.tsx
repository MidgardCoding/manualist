import React from 'react';
import { type JsonResponse, parseApiResponse } from '../utils/parseApiResponse';

interface TableOfContentsProps {
  apiResponse: JsonResponse;
}

export default function TableOfContents({ apiResponse }: TableOfContentsProps) {
  const [parsedContent, setParsedContent] = React.useState<{ sections: { header?: string; subheader?: string }[] } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

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
    <div className="space-y-2 overflow-y-scroll">
      {parsedContent.sections.map((section, index) => (
        <div key={`toc-${index}`} className="collapse bg-base-100 border border-base-300">
          <input type="checkbox" className="peer" />
          <div className="collapse-title text-sm font-semibold peer-checked:bg-base-200 peer-checked:text-base-content">
            {section.header || `Section ${index + 1}`}
          </div>
          <div className="collapse-content text-sm peer-checked:bg-base-200">
            {section.subheader ? (
              <p className="mb-3 opacity-80">{section.subheader}</p>
            ) : (
              <p className="mb-3 opacity-50 italic">No description</p>
            )}
            <button className="btn btn-info btn-sm w-full">Read More</button>
          </div>
        </div>
      ))}
    </div>
  );
}

