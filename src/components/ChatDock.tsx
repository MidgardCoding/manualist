import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store';
import { parseApiResponse } from '../utils/parseApiResponse';
import { supabase } from '../utils/supabase';
import useCredits from '../hooks/useCredits';

type ChatMessage = { role: 'user' | 'assistant'; content: string; timestamp: string };

function getPureSummary(apiResponse: unknown): string {
  if (!apiResponse) return '';
  try {
    const parsed = parseApiResponse(apiResponse as any);
    let out = '';
    for (const sec of parsed.sections) {
      if (sec.header) out += `${sec.header}\n`;
      if (sec.subheader) out += `${sec.subheader}\n`;
      if (sec.text) {
        for (const t of sec.text) {
          const val = (t.plain ?? t.bold ?? t.marker ?? t.italic ?? t.underline ?? '') as string;
          if (val) out += val + ' ';
        }
        out = out.trim() + '\n';
      }
      if (sec.list) {
        for (const item of sec.list) {
          if (typeof item === 'string') out += `- ${item}\n`;
          else if ((item as any).text) {
            const line = ((item as any).text as any[]).map((c: any) => c.plain ?? c.bold ?? c.marker ?? c.italic ?? c.underline ?? '').join('');
            if (line) out += `- ${line}\n`;
          } else if ((item as any).plain) out += `- ${(item as any).plain}\n`;
        }
      }
      if (sec.footnote) out += `${sec.footnote}\n`;
      out += '\n';
    }
    return out.trim().replace(/\s+\n/g, '\n').slice(0, 4000);
  } catch {
    return '';
  }
}

function markdownToHtml(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // code blocks ```...```
  html = html.replace(/```([\s\S]*?)```/g, (_m, p1) => `<pre class="bg-gray-100 p-3 rounded-lg overflow-x-auto my-2 text-sm"><code>${p1}</code></pre>`);
  // inline code `...`
  html = html.replace(/`([^`]+?)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm">$1</code>');
  // bold **...**
  html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  // italic *...* or _..._
  html = html.replace(/\*(.+?)\*/g, '<i>$1</i>');
  html = html.replace(/_(.+?)_/g, '<i>$1</i>');
  // headings
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold mb-4">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold mb-4">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold mb-4">$1</h1>');
  // unordered lists
  html = html.replace(/^\s*[-*] (.+)$/gm, '<li class="ml-6 list-disc">$1</li>');
  // wrap consecutive lis in ul (simple: replace li groups later)
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (m) => `<ul class="mb-4">${m}</ul>`);
  // ordered lists 1. ...
  html = html.replace(/^\s*\d+\. (.+)$/gm, '<li class="ml-6 list-decimal">$1</li>');
  // links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-primary underline">$1</a>');
  // paragraphs: double newline => paragraph, single newline => break
  html = html.replace(/\n\n/g, '</p><p class="my-4 leading-relaxed">');
  html = `<p class="leading-relaxed">${html}</p>`;
  // clean empty p
  html = html.replace(/<p[^>]*>\s*<\/p>/g, '');
  // fix nested p inside ul
  html = html.replace(/<p[^>]*><ul/g, '<ul').replace(/<\/ul><\/p>/g, '</ul>');
  return html;
}

function Markdown({ content }: { content: string }) {
  const html = markdownToHtml(content);
  return <div className="prose prose-sm max-w-none wrap-break-word" dangerouslySetInnerHTML={{ __html: html }} />;
}

function formatChatDate(iso: string): string {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString([], { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

async function streamOpenRouter(
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = (import.meta as any).env.VITE_OPENROUTER_API_KEY as string | undefined;
  if (!apiKey) throw new Error('Missing OpenRouter API key');

  const url = 'https://openrouter.ai/api/v1/chat/completions';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Manualist',
  };

  const payload: any = {
    models: [
      "inclusionai/ling-2.6-flash:free",
      "inclusionai/ling-3.0-flash-fin:free",
      "poolside/laguna-s-2.1:free",
    ],
    messages,
    max_tokens: 2000,
    stream: true,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let body = '';
    try { body = await res.text(); } catch {}
    // fallback to non-stream if streaming not supported for model
    if (res.status === 400 && body.includes('stream')) {
      // retry without stream
      const fallbackPayload = { ...payload, stream: undefined };
      const r2 = await fetch(url, { method: 'POST', headers, body: JSON.stringify(fallbackPayload), signal });
      if (!r2.ok) {
        let b2 = '';
        try { b2 = await r2.text(); } catch {}
        throw new Error(`API ${r2.status} ${b2.slice(0,400)}`);
      }
      const data = await r2.json();
      const content = data?.choices?.[0]?.message?.content ?? '';
      if (content) onChunk(content);
      return content;
    }
    throw new Error(`API ${res.status} ${body.slice(0,400)}`);
  }

  if (!res.body) {
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content ?? '';
    if (content) onChunk(content);
    return content;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let full = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const dataStr = trimmed.slice(5).trim();
      if (dataStr === '[DONE]') break;
      try {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content ?? json.choices?.[0]?.message?.content ?? '';
        if (delta) {
          full += delta;
          onChunk(delta);
        }
      } catch {
        // ignore parse error for keep-alive
      }
    }
  }
  // flush remaining buffer
  if (buffer.trim().startsWith('data:')) {
    try {
      const dataStr = buffer.trim().slice(5).trim();
      if (dataStr && dataStr !== '[DONE]') {
        const json = JSON.parse(dataStr);
        const delta = json.choices?.[0]?.delta?.content ?? '';
        if (delta) { full += delta; onChunk(delta); }
      }
    } catch {}
  }
  return full;
}

export default function ChatDock() {
  const { extractedText, apiResponse, activeManualId } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { deduct } = useCredits();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      abortRef.current?.abort();
    }
  }, [isOpen]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Persist extracted text to Supabase bucket if not yet saved (per-pack)
  useEffect(() => {
    if (!activeManualId || !extractedText || !extractedText.trim()) return;
    const saveIfNeeded = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const path = `${user.id}/${activeManualId}/extracted.txt`;
        // Check if already exists
        const { data: listed } = await supabase.storage.from('user-manuals').list(`${user.id}/${activeManualId}`);
        const exists = (listed as any[])?.some((f: any) => f.name === 'extracted.txt');
        if (exists) return;
        const blob = new Blob([extractedText], { type: 'text/plain' });
        await supabase.storage.from('user-manuals').upload(path, blob, { upsert: false, contentType: 'text/plain' });
        // Also try to ensure user_files entry (optional, pack isolation)
        try {
          await supabase.from('user_files').insert({
            user_id: user.id,
            filename: 'extracted.txt',
            storage_path: path,
            file_type: 'text/plain',
            manual_id: activeManualId,
          } as any);
        } catch {}
      } catch (e) {
        console.warn('save extracted text to bucket failed', e);
      }
    };
    saveIfNeeded();
  }, [activeManualId, extractedText]);

  // Chat persistence helpers - per-manual pack in Supabase bucket
  const chatFileName = 'chat.json';
  const getChatPath = (uid: string, mid: string) => `${uid}/${mid}/${chatFileName}`;
  const localChatKey = (mid: string) => `manualist-chat-${mid}`;

  const loadChatHistory = async (manualId: string): Promise<ChatMessage[] | null> => {
    let storageMsgs: ChatMessage[] | null = null;
    let localMsgs: ChatMessage[] | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const path = getChatPath(user.id, manualId);
        const { data, error } = await supabase.storage.from('user-manuals').download(path);
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            storageMsgs = parsed as ChatMessage[];
            // normalize legacy messages without timestamp
            storageMsgs = storageMsgs.map((m: any) => ({
              role: m.role,
              content: m.content ?? '',
              timestamp: m.timestamp ?? m.created_at ?? new Date().toISOString(),
            }));
          }
        }
      }
    } catch (e) {
      console.warn('load chat from bucket failed', e);
    }
    try {
      const raw = localStorage.getItem(localChatKey(manualId));
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          localMsgs = (parsed as any[]).map((m: any) => ({
            role: m.role,
            content: m.content ?? '',
            timestamp: m.timestamp ?? m.created_at ?? new Date().toISOString(),
          }));
        }
      }
    } catch {}
    // Prefer the longer / more recent history to fix stale bucket after failed upsert
    if (storageMsgs && localMsgs) {
      if (localMsgs.length !== storageMsgs.length) {
        return localMsgs.length > storageMsgs.length ? localMsgs : storageMsgs;
      }
      // same length, pick one with latest timestamp
      const storageLatest = storageMsgs.length ? new Date(storageMsgs[storageMsgs.length - 1].timestamp).getTime() : 0;
      const localLatest = localMsgs.length ? new Date(localMsgs[localMsgs.length - 1].timestamp).getTime() : 0;
      return localLatest > storageLatest ? localMsgs : storageMsgs;
    }
    return storageMsgs ?? localMsgs;
  };

  const saveChatHistory = async (manualId: string, msgs: ChatMessage[]) => {
    // ensure every message has timestamp
    const normalized = msgs.map((m) => ({
      ...m,
      timestamp: (m as any).timestamp ?? new Date().toISOString(),
    }));
    const payload = JSON.stringify(normalized);
    // always keep local fallback in sync
    try {
      localStorage.setItem(localChatKey(manualId), payload);
    } catch {}
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const path = getChatPath(user.id, manualId);
      const blob = new Blob([payload], { type: 'application/json' });
      // Use remove+insert instead of upsert to avoid requiring UPDATE policy (003 not yet applied)
      // This avoids 400 "row violates RLS" on second save when file already exists
      try {
        await supabase.storage.from('user-manuals').remove([path]);
      } catch {}
      const { error } = await supabase.storage.from('user-manuals').upload(path, blob, { upsert: false, contentType: 'application/json' });
      if (error) {
        // If remove+insert still fails (e.g. RLS), keep local fallback silently
        if ((error as any)?.message?.includes('row-level security') || (error as any)?.statusCode === '403') {
          return;
        }
        throw error;
      }
      // ensure user_files entry for pack visibility (optional, ignore RLS errors)
      try {
        const { data: existing } = await supabase.from('user_files').select('id').eq('storage_path', path).eq('manual_id', manualId).limit(1).single();
        if (!existing) {
          await supabase.from('user_files').insert({
            user_id: user.id,
            filename: chatFileName,
            storage_path: path,
            file_type: 'application/json',
            manual_id: manualId,
          } as any);
        }
      } catch {}
    } catch (e: any) {
      // Silently keep local fallback - don't spam console with expected RLS fallback
      if (e?.message?.includes('row-level security') || e?.statusCode === '403') return;
      console.warn('save chat to bucket failed (local fallback kept)', e);
    }
  };

  const isLoadingHistoryRef = useRef(false);
  const skipNextSaveRef = useRef(false);

  // Load chat history every time full chat dock is displayed (isOpen) or manual switches
  useEffect(() => {
    if (!activeManualId) {
      setMessages([]);
      return;
    }
    // Load when dock is displayed or manual changes - per spec "read them every time full chat dock is displayed"
    if (!isOpen) {
      return;
    }
    let cancelled = false;
    isLoadingHistoryRef.current = true;
    skipNextSaveRef.current = true;
    (async () => {
      const history = await loadChatHistory(activeManualId);
      if (cancelled) return;
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        setMessages([]);
      }
      isLoadingHistoryRef.current = false;
      // keep skip flag for one render cycle to avoid immediate re-save of loaded history
      setTimeout(() => { skipNextSaveRef.current = false; }, 500);
    })();
    return () => { cancelled = true; };
  }, [isOpen, activeManualId]);

  // Persist chat history after each completed exchange (not while streaming or loading history)
  useEffect(() => {
    if (!activeManualId) return;
    if (isLoading || isLoadingHistoryRef.current) return;
    if (skipNextSaveRef.current) return;
    if (messages.length === 0) return;
    // Debounce slightly to avoid rapid writes during streaming (we already guard isLoading)
    const t = setTimeout(() => {
      saveChatHistory(activeManualId, messages);
    }, 300);
    return () => clearTimeout(t);
  }, [messages, activeManualId, isLoading]);

  const pureSummary = getPureSummary(apiResponse);
  const manualLength = extractedText?.length ?? 0;

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;
    if (!apiResponse && !extractedText) {
      const now = new Date().toISOString();
      setMessages((prev) => [...prev, { role: 'user', content: trimmed, timestamp: now } as ChatMessage, { role: 'assistant', content: 'No manual loaded. Please create or open a manual first.', timestamp: now } as ChatMessage]);
      setInput('');
      return;
    }

    // Deduct 1 Credit per user message (per spec)
    const canDeduct = await deduct(1);
    if (!canDeduct) {
      return;
    }

    setInput('');
    setIsLoading(true);
    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: 'user', content: trimmed, timestamp: now };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '', timestamp: now } as ChatMessage]);

    const systemPrompt = `You are Manualist, a warm, humane and relaxed assistant that explains manuals in easy, non-technical language. Use as little tech jargon as possible. You can use basic Markdown (bold, italic, lists, inline code, headings).

You received a shorter version of the manual your user is asking about.

Quick Summary (pure text, all formatting and special symbols removed):
---
${pureSummary || '(Quick Summary not available)'}
---

The whole manual has ${manualLength} characters in total. If you need more context from the original manual to answer accurately, reply with ONLY [Need more data (index1:index2)] where index1 and index2 are character indexes (0 to ${manualLength}) of the excerpt you need. Example: [Need more data (0:2000)]

Try to understand the context without asking for the original manual if you can so your user don't have to wait too long for your response. Prefer to answer directly. Only request more data when the Quick Summary is insufficient. Provide short or intermediate answer, include examples of additional questions your user can request from you.`;

    const baseMessages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: trimmed },
    ];

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let full = '';
      const onChunk = (chunk: string) => {
        full += chunk;
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx]?.role === 'assistant') {
            copy[lastIdx] = { ...copy[lastIdx], content: copy[lastIdx].content + chunk };
          }
          return copy;
        });
      };

      let conversation: { role: string; content: string }[] = [...baseMessages];
      full = await streamOpenRouter(conversation, onChunk, controller.signal);

      // Handle multiple [Need more data (a:b)] requests - loop up to 5 times
      const MAX_NEED_MORE_ITERATIONS = 5;
      let iterations = 0;
      while (iterations < MAX_NEED_MORE_ITERATIONS) {
        const needMoreMatch = full.match(/\[Need more data \((\d+):(\d+)\)\]/);
        if (!needMoreMatch) break;

        const s = Math.max(0, Math.min(parseInt(needMoreMatch[1], 10), manualLength));
        const e = Math.max(s, Math.min(parseInt(needMoreMatch[2], 10), manualLength));
        const clampedEnd = Math.min(e, s + 8000);
        let excerpt = '';
        if (extractedText && extractedText.length >= clampedEnd) {
          excerpt = extractedText.slice(s, clampedEnd);
        } else if (activeManualId) {
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
              const path = `${user.id}/${activeManualId}/extracted.txt`;
              const { data, error } = await supabase.storage.from('user-manuals').download(path);
              if (!error && data) {
                const text = await data.text();
                excerpt = text.slice(s, clampedEnd);
              }
            }
          } catch {}
          if (!excerpt && extractedText) excerpt = extractedText.slice(s, clampedEnd);
        }
        if (!excerpt) excerpt = '(Excerpt not available)';

        // Clear the [Need more data] placeholder and prepare to stream the next answer in the same bubble
        setMessages((prev) => {
          const copy = [...prev];
          const lastIdx = copy.length - 1;
          if (copy[lastIdx]?.role === 'assistant') {
            copy[lastIdx] = { role: 'assistant', content: '', timestamp: new Date().toISOString() } as ChatMessage;
          }
          return copy;
        });

        const excerptSystem = `You previously requested more context. Here is the excerpt from the original manual (characters ${s} to ${clampedEnd} of ${manualLength}):

---
${excerpt}
---

Now answer the user's original question: "${trimmed}"

Keep the same humane, easy-to-understand tone, minimal tech jargon, and basic Markdown. If you still need more context, you may again reply with ONLY [Need more data (index1:index2)] but prefer to answer if possible. Provide short or intermediate answer, include examples of additional questions your user can request from you.`;

        conversation = [...conversation, { role: 'assistant', content: full }, { role: 'system', content: excerptSystem }];

        // Stream next answer
        let nextFull = '';
        const onNextChunk = (chunk: string) => {
          nextFull += chunk;
          setMessages((prev) => {
            const copy = [...prev];
            const lastIdx = copy.length - 1;
            if (copy[lastIdx]?.role === 'assistant') {
              copy[lastIdx] = { ...copy[lastIdx], content: copy[lastIdx].content + chunk };
            }
            return copy;
          });
        };

        const nextController = new AbortController();
        abortRef.current = nextController;
        nextFull = await streamOpenRouter(conversation, onNextChunk, nextController.signal);
        full = nextFull;
        iterations += 1;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Chat error', err);
      setMessages((prev) => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        const msg = err instanceof Error ? err.message : 'Failed to get response';
        const nowErr = new Date().toISOString();
        if (copy[lastIdx]?.role === 'assistant' && !copy[lastIdx].content) {
          copy[lastIdx] = { role: 'assistant', content: `⚠️ ${msg}`, timestamp: nowErr } as ChatMessage;
        } else {
          copy.push({ role: 'assistant', content: `⚠️ ${msg}`, timestamp: nowErr } as ChatMessage);
        }
        return copy;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <>
      {/* Backdrop when open */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/10 backdrop-blur-[1px] z-40" onClick={() => setIsOpen(false)} aria-hidden />
      )}

      <div className="fixed bottom-6 left-0 right-0 z-50 flex flex-col items-center px-4 pointer-events-none">
        {/* Chatbox panel - slides up from dock */}
        <div
          className={`w-full max-w-2xl mb-3 bg-white/95 backdrop-blur-md border border-white/90 rounded-[1.5rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            isOpen ? 'h-[68vh] opacity-100 translate-y-0' : 'h-0 opacity-0 translate-y-4 pointer-events-none'
          }`}
          style={{ maxHeight: 'calc(100vh - 8rem)' }}
          role="dialog"
          aria-label="Manualist chat"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white/60">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-semibold">Ask Manualist</p>
              <span className="text-xs opacity-50 hidden sm:inline">| Free model available</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="btn btn-ghost btn-sm btn-circle" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#fffaf0]/50">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-14 h-14 rounded-full bg-warning/20 flex items-center justify-center mb-4">
                  <span className="text-2xl">💬</span>
                </div>
                <p className="text-base font-semibold mb-1">Ask your first question about your manual</p>
                <p className="text-sm opacity-60 max-w-sm">Try “How do I clean the filter?” or “Is the warranty void if I use X?” - Manualist effectively analyzes your manual and provides quick and precise answers.</p>
                <div className="flex flex-wrap gap-2 mt-5 justify-center">
                  {['Summarize safety warnings', 'How to reset?', 'What is in the box?'].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s);
                        setTimeout(() => inputRef.current?.focus(), 50);
                      }}
                      className="btn btn-sm btn-ghost bg-white border border-gray-200 rounded-full"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
                      m.role === 'user' ? 'bg-warning text-warning-content rounded-br-sm' : 'bg-white border border-gray-100 rounded-bl-sm'
                    }`}
                  >
                    {m.role === 'assistant' && !m.content && isLoading && i === messages.length - 1 ? (
                      <span className="flex items-center gap-2">
                        <span className="loading loading-dots loading-sm" /> Thinking…
                      </span>
                    ) : m.role === 'assistant' ? (
                      <Markdown content={m.content} />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    )}
                  </div>
                  <span className="text-[10px] opacity-40 mt-1 px-1">
                    {formatChatDate((m as any).timestamp)}
                  </span>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input inside panel when open */}
          <div className="p-3 border-t border-gray-100 bg-white/80">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about your manual"
                className="flex-1 bg-transparent border-none outline-none px-3 py-2 text-sm placeholder:text-base-content/50"
                disabled={isLoading}
                autoComplete="off"
              />
              <button
                onClick={handleSend}
                disabled={!canSend}
                className="btn btn-circle btn-warning shadow-md hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100"
                aria-label="Send"
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] opacity-40 text-center mt-1">AI can make mistakes - verify with official manual.</p>
          </div>
        </div>

        {/* Dock bar - always visible, clicking unlocks/focuses */}
        <div
          onClick={() => {
            if (!isOpen) setIsOpen(true);
          }}
          className={`w-full max-w-2xl flex items-center gap-2 p-2 rounded-full shadow-2xl border backdrop-blur-md pointer-events-auto cursor-pointer transition-all duration-200 ${
            isOpen ? 'bg-white/90 border-white/90 scale-[0.98] opacity-90' : 'bg-white/70 border-white/90 glass hover:scale-[1.01]'
          }`}
          role="button"
          aria-label={isOpen ? 'Chat dock (focused)' : 'Open chat'}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
        >
          <div className={`flex-1 flex items-center ${!isOpen ? 'pointer-events-none' : ''}`}>
            <input
              ref={isOpen ? undefined : inputRef}
              type="text"
              value=""
              readOnly
              placeholder={isOpen ? 'Chat open - type above' : 'Ask a question about your manual - click to chat'}
              onFocus={() => !isOpen && setIsOpen(true)}
              className="grow bg-transparent border-none outline-none px-4 py-2 text-base-content placeholder:text-base-content/50 text-sm cursor-pointer"
              aria-label="Chat input"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!isOpen) setIsOpen(true);
              else handleSend();
            }}
            className="btn btn-circle btn-warning shadow-md hover:scale-105 transition-transform"
            aria-label={isOpen ? 'Send' : 'Open chat'}
            disabled={isOpen && !canSend && !isLoading ? true : false}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}
