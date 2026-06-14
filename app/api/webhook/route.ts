import { WebhookEvent, MessagingApiClient } from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const client = new MessagingApiClient({ 
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '' 
});

export async function POST(req: Request) {
  try {
    const { events } = await req.json() as { events: WebhookEvent[] };

    for (const event of events) {
      if (event.type === 'postback') {
        const data = JSON.parse(event.postback.data);
        const lineUserId = event.source.userId!;

        const { data: user } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId)
          .single();
          
        if (user) {
          await supabase.from('daily_logs').insert({
            user_id: user.user_id,
            habit_id: data.habitId,
            status: data.status,
            logged_date: new Date().toISOString().split('T')[0]
          });
        }
      }
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
