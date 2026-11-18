'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Send, Loader2, SquarePen, Copy, Check, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert } from '@/components/ui/alert';
import { NoteMarkdown } from '@/components/notes/NoteMarkdown';
import { PinButton } from '@/components/ui/pin-button';
import { cn } from '@/lib/utils';

type Mode = 'beginner' | 'normal' | 'exam_focused' | 'deep';
type Language = 'english' | 'hindi' | 'hinglish';

const MODE_LABELS: Record<Mode, string> = {
  beginner: 'Beginner',
  normal: 'Normal',
  exam_focused: 'Exam-focused',
  deep: 'Deep explanation',
};

const LANG_ATTR: Record<Language, string> = { english: 'en', hindi: 'hi', hinglish: 'hi-Latn' };
const MAX_MESSAGE_CHARS = 4000;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Topic-aware prompts: the first subtopics from the syllabus, plus generic study prompts. */
export function buildSuggestions(topicName: string, subtopics: string[]): string[] {
  const fromSyllabus = subtopics.slice(0, 2).map((s) => `Explain "${s}" in simple terms`);
  return [...fromSyllabus, `Give me an example of ${topicName}`, 'How is this usually examined?'].slice(0, 4);
}

export function ChatWindow({
  topicId,
  topicName,
  subjectName,
  tutorDisplayName,
  initialMode = 'normal',
  language = 'english',
  subtopics = [],
  prefill,
}: {
  topicId: string;
  topicName: string;
  subjectName: string;
  tutorDisplayName: string;
  /** Defaults to the student's Settings > explanation style. */
  initialMode?: Mode;
  language?: Language;
  /** Syllabus subtopics, used for the suggested questions. */
  subtopics?: string[];
  /** Text to put in the input box (e.g. "ask tutor about this notes section"). */
  prefill?: string;
}) {
  // No session exists until the first message is sent (the server creates it).
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(prefill ?? '');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Restore the latest conversation for this topic (does NOT create a session).
  useEffect(() => {
    let cancelled = false;
    setLoadingHistory(true);
    fetch(`/api/tutor/sessions?topicId=${encodeURIComponent(topicId)}&latest=1`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.session) {
          setSessionId(data.session.id);
          setMode(data.session.mode as Mode);
          setMessages((data.messages ?? []).map((m: ChatMessage) => ({ role: m.role, content: m.content })));
        }
      })
      .catch(() => {
        /* start with an empty chat; sending still works */
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, [topicId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  /** Runs one request, streaming when possible. Returns the final session id or throws a user-facing message. */
  const requestReply = useCallback(
    async (body: Record<string, unknown>, onDelta: (text: string) => void): Promise<string | null> => {
      const controller = new AbortController();
      abortRef.current = controller;

      const post = (stream: boolean) =>
        fetch('/api/tutor/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, stream }),
          signal: controller.signal,
        });

      let res: Response;
      try {
        res = await post(true);
      } catch (err) {
        if ((err as Error).name === 'AbortError') throw err;
        res = await post(false); // network hiccup on the streaming call: try the plain path once
      }

      const contentType = res.headers.get('content-type') ?? '';
      if (!res.ok || !contentType.includes('x-ndjson')) {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'The tutor could not respond right now.');
        onDelta(data.reply ?? '');
        return data.sessionId ?? null;
      }

      if (!res.body) throw new Error('Streaming is not supported in this browser.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let newSessionId: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          const event = JSON.parse(line) as { type: string; text?: string; error?: string; sessionId?: string };
          if (event.type === 'delta' && event.text) onDelta(event.text);
          else if (event.type === 'error') throw new Error(event.error || 'The tutor stopped unexpectedly.');
          else if (event.type === 'done') newSessionId = event.sessionId ?? null;
        }
      }
      return newSessionId;
    },
    []
  );

  async function handleSend(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sendingRef.current || loadingHistory) return;
    if (trimmed.length > MAX_MESSAGE_CHARS) {
      setError(`Messages are limited to ${MAX_MESSAGE_CHARS} characters.`);
      return;
    }

    sendingRef.current = true;
    setError(null);
    setSending(true);
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: trimmed }, { role: 'assistant', content: '' }]);

    try {
      const id = await requestReply(
        sessionId ? { sessionId, message: trimmed, mode } : { topicId, message: trimmed, mode },
        (delta) =>
          setMessages((m) => {
            const copy = m.slice();
            const last = copy[copy.length - 1];
            copy[copy.length - 1] = { ...last, content: last.content + delta };
            return copy;
          })
      );
      if (id) setSessionId(id);
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      // Nothing was saved server-side: drop the optimistic bubbles and give the text back.
      setMessages((m) => m.slice(0, -2));
      setInput(trimmed);
      setError(err instanceof Error ? err.message : 'We couldn\u2019t reach the server.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  async function handleRegenerate() {
    if (!sessionId || sendingRef.current) return;
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) return;

    sendingRef.current = true;
    setError(null);
    setSending(true);
    const previous = messages[messages.length - 1];
    setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: '' }]);

    try {
      await requestReply({ sessionId, message: lastUser.content, mode, regenerate: true }, (delta) =>
        setMessages((m) => {
          const copy = m.slice();
          const last = copy[copy.length - 1];
          copy[copy.length - 1] = { ...last, content: last.content + delta };
          return copy;
        })
      );
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setMessages((m) => [...m.slice(0, -1), previous]);
      setError(err instanceof Error ? err.message : 'We couldn\u2019t reach the server.');
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function newChat() {
    if (sendingRef.current) return;
    setSessionId(null);
    setMessages([]);
    setError(null);
    setInput('');
  }

  async function copyMessage(index: number) {
    try {
      await navigator.clipboard.writeText(messages[index].content);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex((c) => (c === index ? null : c)), 1500);
    } catch {
      setError('Copying isn\u2019t available in this browser.');
    }
  }

  const suggestions = buildSuggestions(topicName, subtopics);
  const lang = LANG_ATTR[language];
  const lastIndex = messages.length - 1;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border-2 border-[#B9D9F5] bg-white shadow-window">
      {/* Title bar */}
      <div className="flex select-none items-center justify-between border-b-2 border-[#A8CEF0] bg-gradient-to-r from-[#CDE3F8] via-[#B9D9F5] to-[#CDE3F8] px-4 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#96C2E9] bg-white text-navy shadow-xs">
            <span className="text-base" aria-hidden="true">
              💌
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate font-heading text-sm font-bold text-navy">{tutorDisplayName}</p>
              <span className="rounded-full border border-[#F2D785] bg-[#FFE9A8] px-1.5 text-[9px] font-bold text-navy">
                HaruTutor
              </span>
            </div>
            <p className="truncate font-sans text-[11px] font-semibold text-navy-muted">
              {topicName} &middot; {subjectName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="tutor-mode">
            Explanation style
          </label>
          <select
            id="tutor-mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            title="Applies to your next message — your conversation is kept"
            className="rounded-xl border-2 border-[#96C2E9] bg-white px-2.5 py-1 font-heading text-xs font-bold text-navy shadow-xs focus:outline-none focus:ring-2 focus:ring-[#8EBBE3]"
          >
            {Object.entries(MODE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <PinButton
            id={`tutor-${topicId}`}
            title={`Tutor: ${topicName}`}
            type="tutor"
            href={`/tutor?topicId=${topicId}`}
            badge="Tutor Chat"
            compact
          />
          <Button
            variant="outline"
            size="sm"
            onClick={newChat}
            disabled={sending || messages.length === 0}
            title="Start a new conversation (your old one stays in History)"
            className="h-7 gap-1 rounded-lg px-2 text-xs"
          >
            <SquarePen size={12} aria-hidden="true" /> New chat
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto bg-[#FFFDF9] px-4 py-5 sm:px-6" aria-live="polite">
        {loadingHistory ? (
          <div className="flex items-center gap-2 font-heading text-xs font-bold text-navy-muted">
            <Loader2 className="animate-spin text-[#3D82C4]" size={16} />
            <span>Loading your conversation&hellip;</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col gap-4 py-4">
            <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-4 shadow-xs">
              <p className="mb-1 font-heading text-sm font-bold text-navy">Ask anything about {topicName}:</p>
              <p className="font-sans text-xs font-medium text-navy-muted">
                Pick a prompt below or type your question. I&rsquo;ll explain it step by step.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <button key={q} type="button" onClick={() => handleSend(q)} className="paperclip-pill cursor-pointer text-xs">
                  <span aria-hidden="true">📎</span>
                  <span>{q}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={cn('flex flex-col gap-1', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div
                  lang={lang}
                  className={cn(
                    'font-sans text-sm',
                    m.role === 'user'
                      ? 'h-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-xs border-2 border-[#B9D9F5] bg-[#D7EAFB] px-4 py-3 font-semibold text-navy shadow-xs sm:max-w-2xl'
                      : 'w-full max-w-[96%] rounded-2xl rounded-tl-xs border-2 border-[#D7EAFB] bg-white px-5 py-4 text-navy shadow-card'
                  )}
                >
                  {m.role === 'assistant' ? (
                    m.content ? (
                      <NoteMarkdown content={m.content} />
                    ) : (
                      <span className="flex items-center gap-2 font-heading text-xs font-bold text-[#2A66A3]">
                        <Loader2 className="animate-spin" size={14} /> {tutorDisplayName} is writing&hellip;
                      </span>
                    )
                  ) : (
                    m.content
                  )}
                </div>
                {m.role === 'assistant' && m.content && !(sending && i === lastIndex) && (
                  <div className="flex items-center gap-1 pl-1">
                    <button
                      type="button"
                      onClick={() => copyMessage(i)}
                      aria-label="Copy this reply"
                      className="flex items-center gap-1 rounded-md px-2 py-1 font-heading text-[11px] font-bold text-navy-muted hover:bg-[#EBF4FD] hover:text-navy"
                    >
                      {copiedIndex === i ? <Check size={12} className="text-[#388E3C]" /> : <Copy size={12} />}
                      {copiedIndex === i ? 'Copied' : 'Copy'}
                    </button>
                    {i === lastIndex && sessionId && (
                      <button
                        type="button"
                        onClick={handleRegenerate}
                        disabled={sending}
                        aria-label="Regenerate this reply"
                        className="flex items-center gap-1 rounded-md px-2 py-1 font-heading text-[11px] font-bold text-navy-muted hover:bg-[#EBF4FD] hover:text-navy disabled:opacity-50"
                      >
                        <RefreshCw size={12} /> Regenerate
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="px-5 pb-2">
          <Alert variant="destructive">{error}</Alert>
        </div>
      )}

      {/* Input bar */}
      <div className="flex items-end gap-2 border-t-2 border-[#D7EAFB] bg-white p-3 sm:p-4">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            // Don't send while an IME (Hindi/Devanagari, CJK…) is composing a character.
            if (e.nativeEvent.isComposing || e.keyCode === 229) return;
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(input);
            }
          }}
          maxLength={MAX_MESSAGE_CHARS}
          aria-label="Your question"
          placeholder="Ask a question about this topic..."
          rows={1}
          lang={lang}
          className="min-h-0 resize-none border-2 border-[#D7EAFB]"
          disabled={loadingHistory}
        />
        <Button
          variant="marker"
          onClick={() => handleSend(input)}
          disabled={loadingHistory || sending || !input.trim()}
          aria-label="Send message"
          className="h-10 shrink-0 px-4 shadow-sm"
        >
          {sending ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </Button>
      </div>
    </div>
  );
}
