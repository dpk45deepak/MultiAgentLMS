import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PinnedItemBodySchema, parseJsonBody } from '@/lib/validation/api';
import { z } from 'zod';

const MAX_PINS = 50;

async function authed() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

/** The user's pinned taskbar items (RLS also restricts rows to the owner). */
export async function GET() {
  const { supabase, user } = await authed();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const { data, error } = await supabase
    .from('pinned_items')
    .select('item_key, title, type, href, badge, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(MAX_PINS);
  if (error) return NextResponse.json({ error: 'Could not load your pins.' }, { status: 500 });

  return NextResponse.json({
    items: (data ?? []).map((p) => ({
      id: p.item_key,
      title: p.title,
      type: p.type,
      href: p.href,
      badge: p.badge ?? undefined,
      pinnedAt: new Date(p.created_at).getTime(),
    })),
  });
}

export async function POST(request: Request) {
  const { supabase, user } = await authed();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsed = await parseJsonBody(request, PinnedItemBodySchema);
  if (!parsed.ok) return parsed.response;
  const { itemKey, title, type, href, badge } = parsed.data;

  const { count } = await supabase.from('pinned_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
  if ((count ?? 0) >= MAX_PINS) {
    return NextResponse.json({ error: `You can pin up to ${MAX_PINS} items.` }, { status: 400 });
  }

  const { error } = await supabase
    .from('pinned_items')
    .upsert({ user_id: user.id, item_key: itemKey, title, type, href, badge: badge ?? null }, { onConflict: 'user_id,item_key' });
  if (error) return NextResponse.json({ error: 'Could not save that pin.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await authed();
  if (!user) return NextResponse.json({ error: 'You need to be logged in to do this.' }, { status: 401 });

  const parsed = await parseJsonBody(request, z.object({ itemKey: z.string().trim().min(1).max(200) }));
  if (!parsed.ok) return parsed.response;

  const { error } = await supabase.from('pinned_items').delete().eq('user_id', user.id).eq('item_key', parsed.data.itemKey);
  if (error) return NextResponse.json({ error: 'Could not remove that pin.' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
