// Triggered by a Database Webhook on INSERT into `notifications` (see
// SUPABASE_SQL.md §19 for setup). Looks up the recipient's browser push
// subscriptions and sends them a real push via the Web Push protocol.
//
// Runs with the service role key — it needs to read across users (the
// recipient's subscriptions, the actor's name) which RLS would otherwise
// block. The x-webhook-secret header is the only thing standing in for auth
// here, since --no-verify-jwt is required for Database Webhooks to call it.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('SEND_PUSH_WEBHOOK_SECRET')!;

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT')!,
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function messageFor(record: Record<string, unknown>, actorName: string) {
  switch (record.type) {
    case 'like':
      return { title: 'New like', body: `${actorName} likes you`, url: '/likes' };
    case 'match':
      return { title: "It's a match!", body: `You and ${actorName} liked each other`, url: '/messages' };
    case 'message':
      return { title: actorName, body: String(record.content ?? 'Sent you a message'), url: '/messages' };
    default:
      return { title: 'Venn', body: 'You have a new notification', url: '/' };
  }
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }

  const payload = await req.json();
  const record = payload.record;
  if (!record?.user_id) return new Response('ignored', { status: 200 });

  const actorName = record.actor_id
    ? (await supabase.from('profiles').select('name').eq('id', record.actor_id).single()).data?.name ?? 'Someone'
    : 'Someone';
  const { title, body, url } = messageFor(record, actorName);

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', record.user_id);

  await Promise.all((subs ?? []).map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ title, body, url }),
      );
    } catch (e) {
      // 404/410 means the browser revoked or expired the subscription — prune it
      // so we stop paying for failed sends against it.
      if (e?.statusCode === 404 || e?.statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('id', sub.id);
      } else {
        console.error('push send failed:', e?.message ?? e);
      }
    }
  }));

  return new Response('ok', { status: 200 });
});
