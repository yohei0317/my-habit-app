import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function replyToLine(replyToken: string, messages: any[]) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}

export async function POST(req: Request) {
  try {
    const { events } = await req.json();
    for (const event of events) {
      // 1. 「今日の記録」メッセージ対応
      if (event.type === 'message' && event.message.text === '今日の記録') {
        const { data: user } = await supabase.from('users').select('user_id').eq('line_user_id', event.source.userId).single();
        if (!user) continue;

        const { data: habits } = await supabase.from('habits').select('habit_id, goal_text').eq('user_id', user.user_id).eq('is_active', true).limit(3);
        if (!habits) continue;

        const messages = habits.map((h) => ({
          type: 'template',
          altText: `記録: ${h.goal_text}`,
          template: {
            type: 'buttons',
            text: `${h.goal_text} はどうでしたか？`,
            actions: [
              { type: 'postback', label: 'やった', data: JSON.stringify({ habitId: h.habit_id, status: 'done' }), displayText: 'やった' },
              { type: 'postback', label: 'やってない', data: JSON.stringify({ habitId: h.habit_id, status: 'not_done' }), displayText: 'やってない' }
            ]
          }
        }));
        await replyToLine(event.replyToken, messages);
      }

      // 2. ボタン押下（postback）対応
      if (event.type === 'postback') {
        const parsed = JSON.parse(event.postback.data);
        const { data: user } = await supabase.from('users').select('user_id').eq('line_user_id', event.source.userId).single();
        
        if (user) {
          // 重要：日付を日本時間の今日（YYYY-MM-DD）に固定して保存
          const jstDate = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
          
          await supabase.from('daily_logs').insert({
            user_id: user.user_id,
            habit_id: parsed.habitId, // ここをUUIDとして保存
            status: parsed.status,
            logged_date: jstDate
          });
          await replyToLine(event.replyToken, [{ type: 'text', text: '記録しました！' }]);
        }
      }
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
