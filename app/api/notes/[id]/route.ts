import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });
  }

  const { data: note, error } = await supabase
    .from('notes')
    .select('id, topic_id, created_at, note_sections(section_key, title, content_markdown, order_index)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (error || !note) {
    return NextResponse.json({ error: 'Notes not found.' }, { status: 404 });
  }

  return NextResponse.json(note);
}
