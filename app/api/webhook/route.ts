import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

type LineEvent =
  | {
      type: 'message';
      replyToken: string;
      source: { userId?: string };
      message: { type: 'text'; text: string };
    }
  | {
      type: 'postback';
      replyToken: string;
      source: { userId?: string };
      postback: { data: string };
    };

type WebhookBody = {
  events: LineEvent[];
};

async function replyToLine(replyToken: string, messages: any[]) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply error: ${res.status} ${text}`);
  }
}

function todayString() {
  return new Date().toISOString().split('T')[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookBody;
    const events = body.events || [];

    for (const event of events) {
      if (
        event.type === 'message' &&
        event.message.type === 'text' &&
        event.message.text === '今日の記録'
      ) {
        const lineUserId = event.source.userId;
        if (!lineUserId) continue;

        // 1. ユーザー取得
        const { data: user } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId)
          .single();

        if (!user) {
          await replyToLine(event.replyToken, [{ type: 'text', text: `未連携です。ID: ${lineUserId}` }]);
          continue;
        }

        // 2. 習慣を最大3つ取得
        const { data: habits } = await supabase
          .from('habits')
          .select('habit_id, goal_text')
          .eq('user_id', user.user_id)
          .eq('is_active', true)
          .limit(3);

        if (!habits || habits.length === 0) {
          await replyToLine(event.replyToken, [{ type: 'text', text: '習慣が登録されていません。' }]);
          continue;
        }

        // 3. 最大3通のボタンメッセージを作成
        const messages = habits.map((habit) => ({
          type: 'template',
          altText: `記録: ${habit.goal_text}`,
          template: {
            type: 'buttons',
            text: `${habit.goal_text} はどうでしたか？`,
            actions: [
              {
                type: 'postback',
                label: 'やった',
                data: JSON.stringify({ habitId: habit.habit_id, status: 'done' }),
                displayText: `${habit.goal_text}: やった`
              },
              {
                type: 'postback',
                label: 'やってない',
                data: JSON.stringify({ habitId: habit.habit_id, status: 'not_done' }),
                displayText: `${habit.goal_text}: やってない`
              }
            ]
          }
        }));

        await replyToLine(event.replyToken, messages);
        continue;
      }

      if (event.type === 'postback') {
        const lineUserId = event.source.userId;
        let parsedData: { habitId?: string; status?: string } = {};
        try {
          parsedData = JSON.parse(event.postback.data || '{}');
        } catch { continue; }

        const { data: user } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId!)
          .single();

        if (user) {
          await supabase.from('daily_logs').insert({
            user_id: user.user_id,
            habit_id: parsedData.habitId,
            status: parsedData.status,
            logged_date: todayString(),
          });
          // 返信はシンプルに
          await replyToLine(event.replyToken, [{ type: 'text', text: '記録しました！' }]);
        }
        continue;
      }
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
