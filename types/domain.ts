export type SyllabusInputMode = 'image' | 'text';

export interface TopicListItem {
  id: string;
  name: string;
  unitName: string | null;
  status: 'not_started' | 'notes_ready' | 'completed';
}

export interface NoteSectionView {
  key: string;
  title: string;
  contentMarkdown: string;
}

export interface NotesView {
  id: string;
  topicId: string;
  topicName: string;
  sections: NoteSectionView[];
  createdAt: string;
}
