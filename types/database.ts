// Hand-written types for the tables this codebase actually reads/writes.
// If you use the Supabase CLI, you can replace this file with a generated
// one: `supabase gen types typescript --project-id <id> > types/database.ts`

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Required by @supabase/supabase-js >= 2.5x's generic constraints so the
  // client can resolve PostgREST-version-gated features against a
  // hand-written (non-generated) Database type. Without this, every
  // `.from(...)` call on this type resolves to `never` under newer
  // supabase-js versions than this file was originally written against.
  __InternalSupabase: {
    PostgrestVersion: '12';
  };
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          tutor_display_name: string;
          mentor_display_name: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      subjects: {
        Row: { id: string; user_id: string; name: string; created_at: string };
        Insert: { id?: string; user_id: string; name: string };
        Update: Partial<{ name: string }>;
        Relationships: [];
      };
      syllabus_uploads: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          storage_path: string | null;
          input_mode: 'image' | 'text';
          raw_text_input: string | null;
          status: 'pending' | 'processed' | 'failed';
          failure_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          storage_path?: string | null;
          input_mode: 'image' | 'text';
          raw_text_input?: string | null;
          status?: 'pending' | 'processed' | 'failed';
          failure_reason?: string | null;
        };
        Update: Partial<Database['public']['Tables']['syllabus_uploads']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'syllabus_uploads_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      units: {
        Row: { id: string; subject_id: string; name: string; order_index: number; created_at: string };
        Insert: { id?: string; subject_id: string; name: string; order_index?: number };
        Update: Partial<{ name: string; order_index: number }>;
        Relationships: [
          {
            foreignKeyName: 'units_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
        ];
      };
      topics: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string;
          unit_id: string | null;
          syllabus_upload_id: string | null;
          name: string;
          normalized_name: string;
          order_index: number;
          status: 'not_started' | 'notes_ready' | 'completed';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id: string;
          unit_id?: string | null;
          syllabus_upload_id?: string | null;
          name: string;
          normalized_name: string;
          order_index?: number;
          status?: 'not_started' | 'notes_ready' | 'completed';
        };
        Update: Partial<Database['public']['Tables']['topics']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'topics_subject_id_fkey';
            columns: ['subject_id'];
            isOneToOne: false;
            referencedRelation: 'subjects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topics_unit_id_fkey';
            columns: ['unit_id'];
            isOneToOne: false;
            referencedRelation: 'units';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'topics_syllabus_upload_id_fkey';
            columns: ['syllabus_upload_id'];
            isOneToOne: false;
            referencedRelation: 'syllabus_uploads';
            referencedColumns: ['id'];
          },
        ];
      };
      subtopics: {
        Row: { id: string; topic_id: string; name: string; order_index: number; created_at: string };
        Insert: { id?: string; topic_id: string; name: string; order_index?: number };
        Update: Partial<{ name: string; order_index: number }>;
        Relationships: [
          {
            foreignKeyName: 'subtopics_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          model: string;
          generation_status: 'generating' | 'ready' | 'failed';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          model: string;
          generation_status?: 'generating' | 'ready' | 'failed';
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notes']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'notes_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: true;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      note_sections: {
        Row: {
          id: string;
          note_id: string;
          section_key: string;
          title: string;
          content_markdown: string;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          note_id: string;
          section_key: string;
          title: string;
          content_markdown: string;
          order_index?: number;
        };
        Update: Partial<Database['public']['Tables']['note_sections']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'note_sections_note_id_fkey';
            columns: ['note_id'];
            isOneToOne: false;
            referencedRelation: 'notes';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_memory: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          memory_type: 'completed_topic' | 'strength' | 'weakness' | 'mistake' | 'preference';
          summary: string;
          concept: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          memory_type: 'completed_topic' | 'strength' | 'weakness' | 'mistake' | 'preference';
          summary: string;
          concept?: string | null;
        };
        Update: Partial<Database['public']['Tables']['learning_memory']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'learning_memory_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      learning_sessions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          activity_type: 'notes_generated' | 'notes_viewed' | 'tutor_chat' | 'assessment_attempt';
          chat_session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          activity_type: 'notes_generated' | 'notes_viewed' | 'tutor_chat' | 'assessment_attempt';
          chat_session_id?: string | null;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'learning_sessions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_sessions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string | null;
          mode: 'beginner' | 'normal' | 'exam_focused' | 'deep';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id?: string | null;
          mode?: 'beginner' | 'normal' | 'exam_focused' | 'deep';
        };
        Update: Partial<{ mode: 'beginner' | 'normal' | 'exam_focused' | 'deep' }>;
        Relationships: [
          {
            foreignKeyName: 'chat_sessions_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      chat_messages: {
        Row: { id: string; session_id: string; role: 'user' | 'assistant'; content: string; created_at: string };
        Insert: { id?: string; session_id: string; role: 'user' | 'assistant'; content: string; created_at?: string };
        Update: Partial<{ content: string }>;
        Relationships: [
          {
            foreignKeyName: 'chat_messages_session_id_fkey';
            columns: ['session_id'];
            isOneToOne: false;
            referencedRelation: 'chat_sessions';
            referencedColumns: ['id'];
          },
        ];
      };
      assessments: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'assessments_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_questions: {
        Row: {
          id: string;
          assessment_id: string;
          question: string;
          type: 'mcq' | 'short_answer' | 'long_answer';
          options: string[] | null;
          correct_answer: string | null;
          explanation: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          concept: string;
          concept_id: string | null;
          order_index: number;
          model_answer: string | null;
          rubric: string | null;
          max_marks: number;
        };
        Insert: {
          id?: string;
          assessment_id: string;
          question: string;
          type: 'mcq' | 'short_answer' | 'long_answer';
          options?: string[] | null;
          correct_answer?: string | null;
          explanation?: string | null;
          difficulty: 'easy' | 'medium' | 'hard';
          concept: string;
          concept_id?: string | null;
          order_index?: number;
          model_answer?: string | null;
          rubric?: string | null;
          max_marks?: number;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'assessment_questions_assessment_id_fkey';
            columns: ['assessment_id'];
            isOneToOne: false;
            referencedRelation: 'assessments';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_attempts: {
        Row: {
          id: string;
          assessment_id: string;
          user_id: string;
          score: number | null;
          started_at: string;
          submitted_at: string | null;
        };
        Insert: { id?: string; assessment_id: string; user_id: string; score?: number | null; submitted_at?: string | null };
        Update: Partial<{ score: number | null; submitted_at: string | null }>;
        Relationships: [
          {
            foreignKeyName: 'assessment_attempts_assessment_id_fkey';
            columns: ['assessment_id'];
            isOneToOne: false;
            referencedRelation: 'assessments';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_answers: {
        Row: {
          id: string;
          attempt_id: string;
          question_id: string;
          student_answer: string | null;
          is_correct: boolean | null;
          score: number | null;
          max_score: number | null;
          ai_feedback: {
            feedback: string;
            strengths: string[];
            improvements: string[];
            confidence: number;
          } | null;
          grading_status: 'graded' | 'ungraded' | 'failed';
        };
        Insert: {
          id?: string;
          attempt_id: string;
          question_id: string;
          student_answer?: string | null;
          is_correct?: boolean | null;
          score?: number | null;
          max_score?: number | null;
          ai_feedback?: {
            feedback: string;
            strengths: string[];
            improvements: string[];
            confidence: number;
          } | null;
          grading_status?: 'graded' | 'ungraded' | 'failed';
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'assessment_answers_attempt_id_fkey';
            columns: ['attempt_id'];
            isOneToOne: false;
            referencedRelation: 'assessment_attempts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'assessment_answers_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'assessment_questions';
            referencedColumns: ['id'];
          },
        ];
      };
      performance_records: {
        Row: { id: string; user_id: string; topic_id: string; concept: string; concept_id: string | null; score: number; recorded_at: string };
        Insert: { id?: string; user_id: string; topic_id: string; concept: string; concept_id?: string | null; score: number };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'performance_records_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      assessment_answer_keys: {
        Row: {
          question_id: string;
          correct_answer: string | null;
          model_answer: string | null;
          rubric: string | null;
          explanation: string | null;
        };
        Insert: {
          question_id: string;
          correct_answer?: string | null;
          model_answer?: string | null;
          rubric?: string | null;
          explanation?: string | null;
        };
        Update: Partial<Database['public']['Tables']['assessment_answer_keys']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'assessment_answer_keys_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: true;
            referencedRelation: 'assessment_questions';
            referencedColumns: ['id'];
          },
        ];
      };
      concepts: {
        Row: { id: string; topic_id: string; name: string; normalized_name: string; created_at: string };
        Insert: { id?: string; topic_id: string; name: string; normalized_name: string };
        Update: Partial<{ name: string }>;
        Relationships: [
          {
            foreignKeyName: 'concepts_topic_id_fkey';
            columns: ['topic_id'];
            isOneToOne: false;
            referencedRelation: 'topics';
            referencedColumns: ['id'];
          },
        ];
      };
      mentor_snapshots: {
        Row: { user_id: string; input_hash: string; payload: Json; created_at: string };
        Insert: { user_id: string; input_hash: string; payload: Json; created_at?: string };
        Update: Partial<{ input_hash: string; payload: Json; created_at: string }>;
        Relationships: [];
      };
      pinned_items: {
        Row: {
          id: string;
          user_id: string;
          item_key: string;
          title: string;
          type: string;
          href: string;
          badge: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_key: string;
          title: string;
          type: string;
          href: string;
          badge?: string | null;
        };
        Update: Partial<{ title: string; type: string; href: string; badge: string | null }>;
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: 'llm_call' | 'request';
          feature: string;
          provider: string | null;
          model: string | null;
          tokens_in: number;
          tokens_out: number;
          cost_usd: number;
          credits: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: 'llm_call' | 'request';
          feature: string;
          provider?: string | null;
          model?: string | null;
          tokens_in?: number;
          tokens_out?: number;
          cost_usd?: number;
          credits?: number;
        };
        Update: never;
        Relationships: [];
      };
      plans: {
        Row: {
          id: string;
          name: string;
          monthly_credits: number;
          price_inr: number | null;
          price_usd: number | null;
          is_default: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          monthly_credits: number;
          price_inr?: number | null;
          price_usd?: number | null;
          is_default?: boolean;
        };
        Update: Partial<Database['public']['Tables']['plans']['Insert']>;
        Relationships: [];
      };
      entitlements: {
        Row: { plan_id: string; feature: string; monthly_limit: number | null };
        Insert: { plan_id: string; feature: string; monthly_limit?: number | null };
        Update: Partial<{ monthly_limit: number | null }>;
        Relationships: [];
      };
      subscriptions: {
        Row: {
          user_id: string;
          plan_id: string;
          status: 'active' | 'trialing' | 'past_due' | 'canceled';
          provider: string | null;
          provider_customer_id: string | null;
          provider_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          plan_id: string;
          status?: 'active' | 'trialing' | 'past_due' | 'canceled';
          provider?: string | null;
          provider_customer_id?: string | null;
          provider_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
        };
        Update: Partial<Database['public']['Tables']['subscriptions']['Insert']>;
        Relationships: [];
      };
      mentor_recommendations: {
        Row: { id: string; user_id: string; recommendation: string; reason: string; created_at: string };
        Insert: { id?: string; user_id: string; recommendation: string; reason: string };
        Update: never;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          user_id: string;
          preferred_difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
          explanation_style: 'beginner' | 'normal' | 'exam_focused' | 'deep';
          preferred_language: 'english' | 'hindi' | 'hinglish';
          updated_at: string;
        };
        Insert: {
          user_id: string;
          preferred_difficulty?: 'easy' | 'medium' | 'hard' | 'adaptive';
          explanation_style?: 'beginner' | 'normal' | 'exam_focused' | 'deep';
          preferred_language?: 'english' | 'hindi' | 'hinglish';
          updated_at?: string;
        };
        Update: Partial<{
          preferred_difficulty: 'easy' | 'medium' | 'hard' | 'adaptive';
          explanation_style: 'beginner' | 'normal' | 'exam_focused' | 'deep';
          preferred_language: 'english' | 'hindi' | 'hinglish';
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      submit_assessment_attempt: {
        Args: {
          p_user_id: string;
          p_assessment_id: string;
          p_score: number;
          p_answers: Json;
          p_concept_scores: Json;
          p_weak_concepts: string[];
          p_recovered_concepts: string[];
          p_mark_completed: boolean;
        };
        Returns: Json;
      };
      get_active_days: {
        Args: { p_tz?: string; p_days?: number };
        Returns: { day: string }[];
      };
      get_monthly_usage: {
        Args: { p_user_id: string; p_since: string };
        Returns: { feature: string; requests: number; credits: number }[];
      };
      get_answer_stats: {
        Args: Record<string, never>;
        Returns: { attempted: number; correct: number }[];
      };
      log_tutor_activity: {
        Args: { p_user_id: string; p_topic_id: string; p_chat_session_id: string; p_tz?: string };
        Returns: boolean;
      };
    };
  };
};
