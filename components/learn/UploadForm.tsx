'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { compressImage, TARGET_IMAGE_BYTES } from '@/lib/client/compress-image';
import { LIMITS } from '@/lib/validation/limits';

interface AnalyzedTopic {
  id: string;
  name: string;
  unitName: string;
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];

export function UploadForm() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ subject: string; topics: AnalyzedTopic[] } | null>(null);

  const [manualSubject, setManualSubject] = useState('');
  const [manualTopic, setManualTopic] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

  function chooseFile(candidate: File | undefined | null) {
    setError(null);
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) {
      setError('Please choose a PNG, JPEG or WEBP image.');
      return;
    }
    if (candidate.size > LIMITS.imageBytes * 2) {
      setError('That image is very large. Please choose one under 16MB.');
      return;
    }
    setFile(candidate);
  }

  async function analyzeImage() {
    if (!file || submittingRef.current) return;
    // Shrink before upload so it fits the host's request-size limit.
    const prepared = await compressImage(file, TARGET_IMAGE_BYTES);
    if (prepared.size > LIMITS.imageBytes) {
      setError('That image is still too large after compression. Try a cropped or lower-resolution photo.');
      return;
    }
    const fd = new FormData();
    fd.append('file', prepared);
    await handleAnalyze(fd);
  }

  async function handleAnalyze(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError(null);
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch('/api/syllabus/analyze', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
        return;
      }

      setResult({ subject: data.subject, topics: data.topics });
      router.refresh();
    } catch {
      setError('We couldn\u2019t reach the server. Check your connection and try again.');
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  async function handleManualAdd(e: React.FormEvent) {
    e.preventDefault();
    setManualError(null);

    if (!manualSubject.trim() || !manualTopic.trim()) {
      setManualError('Enter both a subject and a topic.');
      return;
    }

    setManualLoading(true);
    try {
      const res = await fetch('/api/topics/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: manualSubject, topic: manualTopic }),
      });
      const data = await res.json();
      if (!res.ok) {
        setManualError(data.error || 'Could not save that topic.');
        setManualLoading(false);
        return;
      }
      router.push(`/learn/${data.topicId}`); // stay disabled while navigating
    } catch {
      setManualError('We couldn\u2019t reach the server. Please try again.');
      setManualLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Tabs defaultValue="image">
        <TabsList>
          <TabsTrigger value="image">Upload syllabus image</TabsTrigger>
          <TabsTrigger value="text">Paste syllabus text</TabsTrigger>
          <TabsTrigger value="manual">Enter one topic</TabsTrigger>
        </TabsList>

        <TabsContent value="image">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              analyzeImage();
            }}
            className="flex flex-col gap-4"
          >
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                chooseFile(e.dataTransfer.files?.[0]);
              }}
              className={`group flex flex-col items-center justify-center gap-2.5 rounded-2xl border-2 border-dashed border-[#B9D9F5] bg-[#FFFDF9] p-10 text-center transition-all hover:border-[#8EBBE3] hover:bg-[#D7EAFB]/30 ${dragging ? 'border-[#3D82C4] bg-[#D7EAFB]/50' : ''}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D7EAFB] border border-[#B9D9F5] shadow-xs text-navy transition-transform group-hover:scale-110">
                <Upload size={22} className="text-[#3D82C4]" />
              </div>
              <span className="font-heading text-sm font-bold text-navy">
                {file ? file.name : 'Click to choose or drop a photo of your syllabus'}
              </span>
              <span className="font-sans text-xs font-semibold text-navy-muted">PNG, JPEG or WEBP — large photos are shrunk automatically</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => chooseFile(e.target.files?.[0])}
            />
            <Button variant="marker" type="submit" disabled={loading || !file} className="self-start shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Analysing your syllabus&hellip; {elapsed}s
                </>
              ) : (
                'Analyse syllabus'
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="text">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAnalyze(new FormData(e.currentTarget));
            }}
            className="flex flex-col gap-4"
          >
            <Textarea
              name="text"
              placeholder={'Operating System\nUnit 1:\nProcess Management\nCPU Scheduling\nDeadlocks'}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={LIMITS.syllabusText}
              rows={8}
            />
            <p className="self-end font-sans text-xs font-semibold text-navy-muted">
              {text.length.toLocaleString('en-US')}/{LIMITS.syllabusText.toLocaleString('en-US')}
            </p>
            <Button variant="marker" type="submit" disabled={loading || !text.trim()} className="self-start shadow-sm">
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} /> Analysing your syllabus&hellip; {elapsed}s
                </>
              ) : (
                'Analyse syllabus'
              )}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="manual">
          <form onSubmit={handleManualAdd} className="flex flex-col gap-4">
            {manualError && <Alert variant="destructive">{manualError}</Alert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-subject" className="font-heading font-bold text-navy">Subject</Label>
                <Input
                  id="manual-subject"
                  placeholder="Operating Systems"
                  value={manualSubject}
                  maxLength={LIMITS.name}
                  onChange={(e) => setManualSubject(e.target.value)}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="manual-topic" className="font-heading font-bold text-navy">Topic</Label>
                <Input
                  id="manual-topic"
                  placeholder="Deadlocks"
                  value={manualTopic}
                  maxLength={LIMITS.name}
                  onChange={(e) => setManualTopic(e.target.value)}
                />
              </div>
            </div>
            <Button variant="marker" type="submit" disabled={manualLoading} className="self-start shadow-sm">
              {manualLoading ? 'Saving\u2026' : 'Add topic'}
            </Button>
          </form>
        </TabsContent>
      </Tabs>

      {error && <Alert variant="destructive">{error}</Alert>}

      {result && (
        <div className="animate-reveal rounded-2xl border-2 border-[#B9D9F5] bg-[#D7EAFB]/30 p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-[#3D82C4]" />
              <p className="font-heading text-base font-bold text-navy">{result.subject}</p>
            </div>
            <Badge variant="marker">{result.topics.length} topics detected</Badge>
          </div>
          <ul className="flex flex-wrap gap-2">
            {result.topics.map((topic) => (
              <li key={topic.id}>
                <a
                  href={`/learn/${topic.id}`}
                  className="paperclip-pill text-xs"
                >
                  {topic.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
