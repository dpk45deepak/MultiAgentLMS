import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizeLanguage, type PreferredLanguage } from '@/prompts/language';
import { normalizeTimezone } from '@/lib/streak';

export interface LearnerPrefs {
  language: PreferredLanguage;
  preferredDifficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
  explanationStyle: 'beginner' | 'normal' | 'exam_focused' | 'deep';
  timezone: string;
}

/**
 * Reads the signed-in learner's preferences (language, difficulty, style) and
 * timezone, with safe defaults when a row is missing. Never throws: a prefs
 * lookup failure must not block a tutoring request.
 */
export async function fetchLearnerPrefs(supabase: SupabaseClient, userId: string): Promise<LearnerPrefs> {
  const defaults: LearnerPrefs = {
    language: 'english',
    preferredDifficulty: 'medium',
    explanationStyle: 'normal',
    timezone: normalizeTimezone(null),
  };

  try {
    const [prefs, profile] = await Promise.all([
      supabase
        .from('user_preferences')
        .select('preferred_difficulty, explanation_style, preferred_language')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase.from('profiles').select('timezone').eq('id', userId).maybeSingle(),
    ]);

    const p = prefs.data as {
      preferred_difficulty?: LearnerPrefs['preferredDifficulty'];
      explanation_style?: LearnerPrefs['explanationStyle'];
      preferred_language?: string;
    } | null;

    return {
      language: normalizeLanguage(p?.preferred_language),
      preferredDifficulty: p?.preferred_difficulty ?? defaults.preferredDifficulty,
      explanationStyle: p?.explanation_style ?? defaults.explanationStyle,
      timezone: normalizeTimezone((profile.data as { timezone?: string } | null)?.timezone),
    };
  } catch {
    return defaults;
  }
}
