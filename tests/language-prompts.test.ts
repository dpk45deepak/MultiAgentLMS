import { describe, it, expect } from 'vitest';
import { buildLanguageInstruction, normalizeLanguage } from '@/prompts/language';
import { buildNotesSystemPrompt, NOTES_AGENT_SYSTEM_PROMPT } from '@/prompts/notes';
import { buildTutorSystemPrompt } from '@/prompts/tutor';
import { buildMentorSystemPrompt } from '@/prompts/mentor';
import { buildGradingSystemPrompt } from '@/prompts/grading';
import { buildAssessmentSystemPrompt } from '@/prompts/assessment';

describe('preferred language reaches every system prompt', () => {
  it('normalises unknown values to English', () => {
    expect(normalizeLanguage('klingon')).toBe('english');
    expect(normalizeLanguage('hindi')).toBe('hindi');
    expect(normalizeLanguage(undefined)).toBe('english');
  });

  it('describes Hindi and Hinglish distinctly', () => {
    expect(buildLanguageInstruction('hindi')).toContain('Devanagari');
    expect(buildLanguageInstruction('hinglish')).toContain('Hinglish');
    expect(buildLanguageInstruction('english')).toContain('English');
  });

  const tutorParams = { topicName: 'Deadlocks', subjectName: 'OS', mode: 'normal' as const, tutorDisplayName: 'Haru' };

  it('notes prompt', () => {
    expect(buildNotesSystemPrompt('hindi')).toContain('Devanagari');
    expect(buildNotesSystemPrompt('hinglish')).toContain('Hinglish');
    expect(NOTES_AGENT_SYSTEM_PROMPT).toContain('English');
  });

  it('tutor prompt', () => {
    expect(buildTutorSystemPrompt({ ...tutorParams, language: 'hindi' })).toContain('Devanagari');
    expect(buildTutorSystemPrompt({ ...tutorParams, language: 'hinglish' })).toContain('Hinglish');
  });

  it('mentor prompt', () => {
    expect(buildMentorSystemPrompt('Haru', 'hinglish')).toContain('Hinglish');
  });

  it('grading prompt', () => {
    expect(buildGradingSystemPrompt('hindi')).toContain('Devanagari');
  });

  it('assessment prompt keeps the JSON shape/answer key in English', () => {
    const prompt = buildAssessmentSystemPrompt('hindi');
    expect(prompt).toContain('Devanagari');
    expect(prompt).toContain('correctAnswer');
    expect(prompt).toContain('MUST stay exactly as specified in English');
  });
});
