'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Check, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';

type Difficulty = 'easy' | 'medium' | 'hard' | 'adaptive';
type ExplanationStyle = 'beginner' | 'normal' | 'exam_focused' | 'deep';
type Language = 'english' | 'hindi' | 'hinglish';

interface SettingsValues {
  email: string;
  displayName: string;
  tutorDisplayName: string;
  mentorDisplayName: string;
  preferredDifficulty: Difficulty;
  explanationStyle: ExplanationStyle;
  preferredLanguage: Language;
}

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'adaptive', label: 'Adaptive (recommended)' },
  { value: 'easy', label: 'Beginner' },
  { value: 'medium', label: 'Intermediate' },
  { value: 'hard', label: 'Advanced' },
];

const EXPLANATION_OPTIONS: { value: ExplanationStyle; label: string; hint: string }[] = [
  { value: 'beginner', label: 'Simple', hint: 'Short, plain-language explanations' },
  { value: 'normal', label: 'Detailed', hint: 'Balanced depth for regular study' },
  { value: 'exam_focused', label: 'Exam-focused', hint: 'Tuned toward what gets tested' },
  { value: 'deep', label: 'Conceptual', hint: 'Goes deeper into why, not just what' },
];

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: 'english', label: 'English' },
  { value: 'hindi', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
];

function fieldsEqual(a: SettingsValues, b: SettingsValues) {
  return (
    a.displayName === b.displayName &&
    a.tutorDisplayName === b.tutorDisplayName &&
    a.mentorDisplayName === b.mentorDisplayName &&
    a.preferredDifficulty === b.preferredDifficulty &&
    a.explanationStyle === b.explanationStyle &&
    a.preferredLanguage === b.preferredLanguage
  );
}

export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const [saved, setSaved] = useState(initial);
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const dirty = useMemo(() => !fieldsEqual(values, saved), [values, saved]);

  // Warn before leaving the tab with unsaved changes (requirement: "unsaved
  // changes handling"). Doesn't block in-app navigation — just the tab/window.
  useEffect(() => {
    if (!dirty) return;
    function handler(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  function update<K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
    setSuccess(false);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: values.displayName,
          tutorDisplayName: values.tutorDisplayName,
          mentorDisplayName: values.mentorDisplayName,
          preferredDifficulty: values.preferredDifficulty,
          explanationStyle: values.explanationStyle,
          preferredLanguage: values.preferredLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not save your settings.');
        return;
      }
      setSaved(values);
      setSuccess(true);
    } catch {
      setError('We couldn\u2019t reach the server. Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  }

  function handleDiscard() {
    setValues(saved);
    setError(null);
    setSuccess(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative overflow-hidden">
        <div className="washi-tape washi-tape-blue -top-2.5 right-8" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base">🏷️</span>
            Tutor &amp; Mentor Personas
          </CardTitle>
          <CardDescription>Personalize the friendly names for your study companion agents.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="tutorDisplayName" className="font-bold text-navy">AI Tutor name</Label>
            <Input
              id="tutorDisplayName"
              value={values.tutorDisplayName}
              maxLength={40}
              onChange={(e) => update('tutorDisplayName', e.target.value)}
              placeholder="e.g. Haru Tutor"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mentorDisplayName" className="font-bold text-navy">AI Mentor name</Label>
            <Input
              id="mentorDisplayName"
              value={values.mentorDisplayName}
              maxLength={40}
              onChange={(e) => update('mentorDisplayName', e.target.value)}
              placeholder="e.g. Sensei Mentor"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <div className="washi-tape washi-tape-yellow -top-2.5 right-8" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base">✨</span>
            Learning Preferences
          </CardTitle>
          <CardDescription>
            These shape how the Tutor explains concepts and what difficulty assessments start at.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredLanguage" className="font-bold text-navy">Preferred language</Label>
            <select
              id="preferredLanguage"
              value={values.preferredLanguage}
              onChange={(e) => update('preferredLanguage', e.target.value as Language)}
              className="flex h-11 w-full rounded-xl border-2 border-[#D7EAFB] bg-white px-3.5 py-2 text-sm text-navy font-semibold shadow-xs transition-colors hover:border-[#8EBBE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D9F5] focus-visible:border-[#5A9BD5]"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="preferredDifficulty" className="font-bold text-navy">Assessment difficulty</Label>
            <select
              id="preferredDifficulty"
              value={values.preferredDifficulty}
              onChange={(e) => update('preferredDifficulty', e.target.value as Difficulty)}
              className="flex h-11 w-full rounded-xl border-2 border-[#D7EAFB] bg-white px-3.5 py-2 text-sm text-navy font-semibold shadow-xs transition-colors hover:border-[#8EBBE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B9D9F5] focus-visible:border-[#5A9BD5]"
            >
              {DIFFICULTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-navy-muted">
              &ldquo;Adaptive&rdquo; adjusts to your last score on each topic; fixed levels always start new
              quizzes at that benchmark.
            </p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-bold text-navy">Tutor explanation style</legend>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {EXPLANATION_OPTIONS.map((opt) => {
                const isSelected = values.explanationStyle === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-3.5 text-sm transition-all duration-200 ${
                      isSelected
                        ? 'border-[#8EBBE3] bg-[#B9D9F5]/40 text-navy shadow-xs ring-1 ring-[#8EBBE3]'
                        : 'border-[#D7EAFB] bg-white text-navy hover:border-[#8EBBE3] hover:bg-[#FFFDF8]'
                    }`}
                  >
                    <span className="flex items-center gap-2 font-bold text-navy">
                      <input
                        type="radio"
                        name="explanationStyle"
                        value={opt.value}
                        checked={isSelected}
                        onChange={() => update('explanationStyle', opt.value)}
                        className="accent-[#3D82C4] h-4 w-4"
                      />
                      {opt.label}
                    </span>
                    <span className="pl-6 text-xs text-navy-muted">{opt.hint}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-xs text-navy-muted">
              Default mode for new Tutor conversations — you can switch modes anytime inside the chat header.
            </p>
          </fieldset>
        </CardContent>
      </Card>

      <Card className="relative overflow-hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-base">👤</span>
            Account Credentials
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="displayName" className="font-bold text-navy">Display name</Label>
            <Input
              id="displayName"
              value={values.displayName}
              maxLength={80}
              onChange={(e) => update('displayName', e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label className="font-bold text-navy">Email address</Label>
            <p className="rounded-xl border-2 border-[#D7EAFB]/60 bg-[#D7EAFB]/20 px-3.5 py-2.5 text-sm font-medium text-navy-muted">
              {initial.email}
            </p>
          </div>
        </CardContent>
      </Card>

      {error && <Alert variant="destructive">{error}</Alert>}
      {success && !dirty && (
        <Alert variant="success" className="flex items-center gap-2">
          <Check size={16} className="text-[#64B587]" /> Settings successfully saved to your profile!
        </Alert>
      )}

      <div className="sticky bottom-4 z-10 flex flex-col-reverse items-stretch justify-end gap-3 rounded-2xl border-2 border-[#B9D9F5] bg-white/95 px-5 py-3.5 shadow-lg backdrop-blur sm:flex-row sm:items-center">
        {dirty && (
          <Button variant="ghost" size="sm" onClick={handleDiscard} disabled={saving} className="rounded-xl font-bold text-navy-muted hover:text-navy">
            <RotateCcw size={14} className="mr-1.5" /> Discard changes
          </Button>
        )}
        <Button onClick={handleSave} disabled={!dirty || saving} className="shadow-retro-btn font-bold">
          {saving ? (
            <>
              <Loader2 className="animate-spin mr-1.5" size={16} /> Saving&hellip;
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </div>
  );
}

