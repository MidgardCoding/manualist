import React from 'react';

// Typy dla struktury danych
interface TextContent {
  plain?: string;
  marker?: string;
  bold?: string;
  italic?: string;
  underline?: string;
}

interface ListItem {
  text?: TextContent[];
  plain?: string;
}

interface Section {
  header?: string;
  subheader?: string;
  text?: TextContent[];
  list?: (string | ListItem)[];
  footnote?: string;
}

interface JsonResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

interface ParsedContent {
  sections: Section[];
}

// Komponent renderujący pojedynczy element text
const TextElement: React.FC<{ content: TextContent }> = ({ content }) => {
  const elements: React.ReactNode[] = [];

  if (content.plain) {
    elements.push(<span key="plain">{content.plain}</span>);
  }
  if (content.marker) {
    elements.push(
      <mark key="marker" className="bg-yellow-300 px-1 rounded">
        {content.marker}
      </mark>
    );
  }
  if (content.bold) {
    elements.push(<b key="bold">{content.bold}</b>);
  }
  if (content.italic) {
    elements.push(<i key="italic">{content.italic}</i>);
  }
  if (content.underline) {
    elements.push(<u key="underline">{content.underline}</u>);
  }

  return <>{elements}</>;
};

// Komponent renderujący linię text (array TextContent)
const TextLine: React.FC<{ line: TextContent[] }> = ({ line }) => (
  <p className="mb-4 leading-relaxed">
    {line.map((content, index) => (
      <TextElement key={index} content={content} />
    ))}
  </p>
);

// Komponent renderujący element listy
const ListItemElement: React.FC<{ item: string | ListItem }> = ({ item }) => {
  if (typeof item === 'string') {
    return <li className="mb-2">{item}</li>;
  }
  
  if (item.text && item.text.length > 0) {
    return (
      <li className="mb-2">
        <span className="flex items-start">
        <span className="w-2 h-2 bg-primary rounded-full mt-2 mr-3 flex-shrink-0"></span>
          <TextLine line={item.text} />
        </span>
      </li>
    );
  }
  
  return null;
};

// Komponent renderujący sekcję
const SectionComponent: React.FC<{ section: Section }> = ({ section }) => (
  <div className="mb-12">
    {section.header && (
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
        {section.header}
      </h1>
    )}
    
    {section.subheader && (
      <h3 className="text-2xl font-semibold mb-6">
        {section.subheader}
      </h3>
    )}
    
    <div className="space-y-4 mb-8">
      {section.text && Array.isArray(section.text) && section.text.map((line, index) => (
        line && Object.keys(line).length > 0 ? (
          <TextLine key={`text-${index}`} line={[line]} />
        ) : null
      ))}
    </div>
    
    {section.list && section.list.length > 0 && (
  <ul className="space-y-2 ml-6">
    {section.list.map((item, index) => (
      <ListItemElement key={`list-${index}`} item={item} />
    ))}
  </ul>
    )}
    
    {section.footnote && (
      <div className="mt-6 pt-4 border-t border-base-200">
  <small className="italic block">
    {section.footnote}
  </small>
      </div>
    )}
  </div>
);

// Główny komponent parsera JSON
const JsonContentParser = React.memo(({ jsonData }: { jsonData: JsonResponse }) => {
  const [parsedContent, setParsedContent] = React.useState<ParsedContent | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    try {
      const messageContent = jsonData.choices[0]?.message.content;
      if (!messageContent) {
        throw new Error('No message content found');
      }

      // Extract JSON string: cut from first '{' to last '}' , removing ```json prefixes
      const firstBrace = messageContent.indexOf('{');
      const lastBrace = messageContent.lastIndexOf('}');
      let jsonString = messageContent.slice(firstBrace, lastBrace + 1);
      
      // Clean up common prefixes like ```json
      jsonString = jsonString.replace(/^```json\s*/g, '').replace(/\s*```$/g, '').trim();
      
      const parsedJson = JSON.parse(jsonString);
      
      if (parsedJson.sections) {
        setParsedContent({ sections: parsedJson.sections });
      } else {
        throw new Error('No sections found in JSON');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Parsing error');
    }
  }, [jsonData]);

  if (error) {
    return (
        <div className="alert alert-error">
          <span>Error: {error}</span>
        </div>
    );
  }

  if (!parsedContent) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-12 max-w-4xl">
      <div className="prose prose-headings:font-bold prose-p:leading-relaxed prose-a:text-black max-w-none">
        {parsedContent.sections.map((section, index) => (
          <SectionComponent key={`section-${index}`} section={section} />
        ))}
      </div>
    </div>
  );
},)

export default JsonContentParser;