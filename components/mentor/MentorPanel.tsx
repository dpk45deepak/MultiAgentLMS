'use client';

import { useEffect, useState } from 'react';
import { Youtube, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

interface Recommendation {
  topic: string;
  reason: string;
  action: string;
  youtubeSearchUrl: string;
}

interface MentorResponse {
  summary: string;
  performance: { strong: string[]; moderate: string[]; weak: string[]; hasData: boolean };
  recommendations: Recommendation[];
  /** True when new results exist since the cached advice was written. */
  stale?: boolean;
  /** True when there is data but no advice has been generated yet. */
  needsGeneration?: boolean;
}

export function MentorPanel({ mentorDisplayName }: { mentorDisplayName: string }) {
  const [data, setData] = useState<MentorResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Reads the cached advice. Never calls the AI. */
  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mentor/recommendations');
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Could not load your mentor\u2019s recommendation.');
        return;
      }
      setData(json);
    } catch {
      setError('We couldn\u2019t reach the server.');
    } finally {
      setLoading(false);
    }
  }

  /** Explicit refresh: asks the mentor to (re)generate advice from the latest results. */
  async function refresh() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/mentor/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not refresh your mentor\u2019s recommendation.');
        return;
      }
      setData(json);
    } catch {
      setError('We couldn\u2019t reach the server.');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ink-faint">
        <Loader2 className="animate-spin" size={16} /> {mentorDisplayName} is reviewing your progress&hellip;
      </div>
    );
  }

  if (!data) {
    return error ? <Alert variant="destructive">{error}</Alert> : null;
  }

  return (
    <div className="flex flex-col gap-6 text-navy">
      {/* Mentor Memo Box with washi tape */}
      <div className="relative rounded-2xl border-2 border-[#B9D9F5] bg-gradient-to-br from-[#FFFDF9] via-white to-[#D7EAFB]/30 p-6 shadow-window washi-tape washi-tape-blue">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌸</span>
            <p className="font-heading text-base font-bold text-navy">{mentorDisplayName}&rsquo;s Advice</p>
          </div>
          {data.performance.hasData && (
            <Button variant="outline" size="sm" onClick={refresh} disabled={generating} className="h-8 gap-1 text-xs">
              {generating ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
              <span>{data.needsGeneration ? 'Get recommendations' : generating ? 'Thinking\u2026' : 'Refresh'}</span>
            </Button>
          )}
        </div>
        <p className="font-sans text-xs font-semibold leading-relaxed text-navy-muted sm:text-sm">
          {data.summary}
        </p>
        {data.stale && (
          <p className="mt-3 rounded-lg border border-[#FFE9A8] bg-[#FFF8E1] px-3 py-2 font-sans text-xs font-semibold text-navy">
            You have new results since this advice was written. Press Refresh to update it.
          </p>
        )}
        {error && <Alert variant="destructive" className="mt-3">{error}</Alert>}
      </div>

      {data.performance.hasData && (
        <div className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-card">
          <p className="font-heading text-xs font-bold uppercase tracking-wider text-navy-muted mb-3">
            Performance Breakdown
          </p>
          <div className="flex flex-wrap gap-5">
            <PerformanceGroup label="Strong Concepts" items={data.performance.strong} variant="mint" />
            <PerformanceGroup label="Getting There" items={data.performance.moderate} variant="highlight" />
            <PerformanceGroup label="Needs Work" items={data.performance.weak} variant="flag" />
          </div>
        </div>
      )}

      {/* Recommendations Cards */}
      <div className="flex flex-col gap-3.5">
        <p className="font-heading text-xs font-bold uppercase tracking-wider text-navy-muted">
          Recommended Next Steps ({data.recommendations.length})
        </p>
        {data.recommendations.map((rec, i) => (
          <div key={i} className="rounded-2xl border-2 border-[#D7EAFB] bg-white p-5 shadow-xs transition-all hover:border-[#B9D9F5]">
            <p className="font-heading text-base font-bold text-navy">{rec.topic}</p>
            <p className="mt-1 font-sans text-xs font-semibold text-navy-muted">{rec.reason}</p>
            <p className="mt-2 font-sans text-xs font-bold text-[#3D82C4]">{rec.action}</p>
            <a
              href={rec.youtubeSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 paperclip-pill text-xs font-bold"
            >
              <Youtube size={14} className="text-[#E11D48]" />
              <span>Search YouTube for this topic</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}

function PerformanceGroup({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: 'mint' | 'highlight' | 'flag';
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 font-heading text-xs font-bold text-navy-muted">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant={variant}>
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}
