'use client';

import { useState, useMemo } from 'react';
import { Search, ChevronsDownUp, ChevronsUpDown, Clock, BookOpen, Layers } from 'lucide-react';
import { NoteSection } from './NoteSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { NoteSectionView } from '@/types/domain';

export function NotesReader({ sections, topicId }: { sections: NoteSectionView[]; topicId?: string }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [allExpanded, setAllExpanded] = useState<boolean | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    // Default open first section
    if (sections.length > 0) {
      return { [sections[0].key]: true };
    }
    return {};
  });

  const totalWords = useMemo(() => {
    return sections.reduce((acc, s) => acc + (s.contentMarkdown?.split(/\s+/).length || 0), 0);
  }, [sections]);

  const estimatedMinutes = Math.max(1, Math.ceil(totalWords / 200));

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      (s) => s.title.toLowerCase().includes(q) || s.contentMarkdown.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  // While searching, every matching section is shown expanded so the match is visible.
  const isSearching = searchQuery.trim().length > 0;

  function handleToggleAll() {
    if (allExpanded) {
      setAllExpanded(false);
      setOpenSections({});
    } else {
      setAllExpanded(true);
      const all: Record<string, boolean> = {};
      sections.forEach((s) => {
        all[s.key] = true;
      });
      setOpenSections(all);
    }
  }

  function handleSectionToggle(key: string) {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleJumpToSection(key: string, index: number) {
    setOpenSections((prev) => ({
      ...prev,
      [key]: true,
    }));
    const el = document.getElementById(`section-${index}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="flex flex-col gap-3 rounded-2xl border-2 border-[#D7EAFB] bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-navy-muted" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search within notes, formulas, concepts..."
            className="pl-9 pr-4 text-xs sm:text-sm bg-[#FFFDF9] border-2 border-[#D7EAFB]"
          />
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
          <div className="hidden lg:flex items-center gap-3 font-heading text-xs font-bold text-navy-muted mr-2">
            <span className="flex items-center gap-1">
              <Layers size={13} className="text-[#3D82C4]" />
              {sections.length} sections
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-[#E5A93C]" />
              ~{estimatedMinutes} min read
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggleAll}
            className="flex items-center gap-1.5 text-xs text-navy"
          >
            {allExpanded ? (
              <>
                <ChevronsDownUp size={14} className="text-[#3D82C4]" />
                <span>Collapse All</span>
              </>
            ) : (
              <>
                <ChevronsUpDown size={14} className="text-[#3D82C4]" />
                <span>Expand All</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quick Jump Pills Carousel */}
      {sections.length > 1 && !searchQuery && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-navy-muted shrink-0 mr-1 flex items-center gap-1">
            <BookOpen size={12} /> Jump:
          </span>
          {sections.map((section, idx) => (
            <button
              key={section.key}
              onClick={() => handleJumpToSection(section.key, idx)}
              className="paperclip-pill text-xs shrink-0 cursor-pointer"
            >
              <span className="text-[10px] opacity-75 mr-1 font-mono">#{String(idx + 1).padStart(2, '0')}</span>
              <span>{section.title}</span>
            </button>
          ))}
        </div>
      )}

      {/* Sections List */}
      {filteredSections.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-paper-raised p-12 text-center">
          <Search size={28} className="mx-auto text-slate-300 mb-3" />
          <h4 className="font-serif text-base font-bold text-ink">No matching sections found</h4>
          <p className="mt-1 text-sm text-ink-soft">
            Try adjusting your search query &ldquo;{searchQuery}&rdquo;.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery('')}
            className="mt-4"
          >
            Clear Search
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3.5">
          {filteredSections.map((section, i) => (
            <NoteSection
              key={section.key}
              index={i}
              title={section.title}
              content={section.contentMarkdown}
              isOpen={isSearching ? true : openSections[section.key] ?? false}
              onToggle={() => handleSectionToggle(section.key)}
              highlight={searchQuery.trim()}
              askTutorHref={
                topicId ? `/tutor?topicId=${topicId}&section=${encodeURIComponent(section.title.slice(0, 120))}` : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
