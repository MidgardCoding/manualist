import React from 'react';
import { useAppStore } from '../store';
import { sendToDoPrompt } from '../text-generation/OpenRouter';
import { parseApiResponse, type ParsedContent } from '../utils/parseApiResponse';
import { TextElement } from '../text-generation/TextRenderer';
import { supabase } from '../utils/supabase';

interface Props {
  cachedResponse?: unknown;
  manualId?: string | null;
}

export default function ToDoSteps({ cachedResponse, manualId }: Props) {
  const { extractedText, todoResponse, setTodoResponse, activeManualId } = useAppStore();
  const effectiveManualId = manualId ?? activeManualId ?? null;
  const [parsedContent, setParsedContent] = React.useState<ParsedContent | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [checked, setChecked] = React.useState<boolean[]>([]);
  const [loadingChecked, setLoadingChecked] = React.useState(false);

  const effectiveResponse = cachedResponse ?? todoResponse;

  React.useEffect(() => {
    if (effectiveResponse) {
      try {
        const result = parseApiResponse(effectiveResponse as any);
        setParsedContent(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Parsing error');
      }
      return;
    }

    if (!extractedText.trim()) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    sendToDoPrompt(extractedText)
      .then((data) => {
        if (cancelled) return;
        setTodoResponse(data);
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
  }, [extractedText, effectiveResponse, setTodoResponse]);

  // Load per-pack checked state from DB (or fallback) after we know the sections
  React.useEffect(() => {
    if (!parsedContent) return;

    const len = parsedContent.sections.length;
    if (!effectiveManualId) {
      setChecked(Array(len).fill(false));
      return;
    }

    let cancelled = false;
    setLoadingChecked(true);
    (async () => {
      try {
        // Use select('*') to avoid 400 if todo_checked column not yet migrated
        const { data, error } = await supabase
          .from('manuals')
          .select('*')
          .eq('id', effectiveManualId)
          .single();

        if (cancelled) return;

        if (error) {
          // try per-manual local fallback
          const local = localStorage.getItem(`manualist-todo-${effectiveManualId}`);
          if (local) {
            try {
              const arr = JSON.parse(local);
              if (Array.isArray(arr)) {
                const normalized = Array(len).fill(false).map((_, i) => !!arr[i]);
                setChecked(normalized);
                setLoadingChecked(false);
                return;
              }
            } catch {}
          }
          // also check fallback manuals pack
          try {
            const raw = localStorage.getItem('manualist-fallback-manuals');
            if (raw) {
              const arr = JSON.parse(raw);
              const found = arr.find((m: any) => m.id === effectiveManualId);
              if (found && Array.isArray(found.todo_checked)) {
                const normalized = Array(len).fill(false).map((_, i) => !!found.todo_checked[i]);
                setChecked(normalized);
                setLoadingChecked(false);
                return;
              }
            }
          } catch {}
          setChecked(Array(len).fill(false));
        } else {
          const arr = (data as any)?.todo_checked;
          if (Array.isArray(arr)) {
            const normalized = Array(len).fill(false).map((_, i) => !!arr[i]);
            setChecked(normalized);
          } else {
            setChecked(Array(len).fill(false));
          }
        }
      } catch {
        if (!cancelled) setChecked(Array(len).fill(false));
      } finally {
        if (!cancelled) setLoadingChecked(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parsedContent, effectiveManualId]);

  const handleToggle = async (idx: number) => {
    if (!parsedContent) return;
    const next = [...checked];
    next[idx] = !next[idx];
    // pad if needed
    while (next.length < parsedContent.sections.length) next.push(false);
    setChecked(next);

    if (!effectiveManualId) return;

    // persist to pack in DB + fallback
    try {
      const { error } = await supabase
        .from('manuals')
        .update({ todo_checked: next } as any)
        .eq('id', effectiveManualId);
      if (error) throw error;
    } catch (e: any) {
      const msg = e?.message ?? '';
      const code = e?.code ?? '';
      const isColumnMissing = msg.includes('todo_checked') || code === '42703';
      // always store locally as backup
      try {
        localStorage.setItem(`manualist-todo-${effectiveManualId}`, JSON.stringify(next));
      } catch {}
      if (isColumnMissing) {
        console.warn('todo_checked column missing, stored locally');
      } else {
        console.warn('todo_checked save failed, stored locally', e);
      }
    }

    // keep fallback pack in sync
    try {
      const raw = localStorage.getItem('manualist-fallback-manuals');
      if (raw) {
        const arr = JSON.parse(raw);
        const idx = arr.findIndex((m: any) => m.id === effectiveManualId);
        if (idx !== -1) {
          arr[idx].todo_checked = next;
          localStorage.setItem('manualist-fallback-manuals', JSON.stringify(arr));
        }
      }
    } catch {}
  };

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
      {parsedContent.sections.map((section, index) => {
        const isChecked = !!checked[index];
        return (
        <div key={`todo-${index}`} className={`card w-full border transition-colors ${isChecked ? 'bg-base-200 border-success/30' : 'bg-base-100 border-base-300'}`}>
          <div className="flex float-left p-4 items-center">
            <input
              type="checkbox"
              className="checkbox checkbox-primary me-4"
              checked={isChecked}
              disabled={loadingChecked && !effectiveManualId ? false : loadingChecked}
              onChange={() => handleToggle(index)}
              aria-label={`Mark step ${index + 1} as done`}
            />
            <div className={`card-title text-sm font-semibold ${isChecked ? 'line-through opacity-60' : ''}`}>
              Step {index + 1}
            </div>
            {isChecked && <span className="badge badge-success badge-xs ml-2">Done</span>}
          </div>
          <div>
            <div className={`card-content text-sm px-4 pb-2 ${isChecked ? 'opacity-60' : ''}`}>
              {section.text && section.text.length > 0 && (
                <p className={`mb-3 leading-relaxed ${isChecked ? 'line-through' : ''}`}>
                  {section.text.map((line, i) => (
                    <TextElement key={i} content={line} />
                  ))}
                </p>
              )}
              {section.list && section.list.length > 0 && (
                <ul className="list-disc list-inside mb-3 space-y-1">
                  {section.list.map((item, i) => (
                    <li key={i} className={isChecked ? 'line-through' : ''}>
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
        );
      })}
    </div>
  );
}
