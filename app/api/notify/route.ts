import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

async function pushToLine(to: string, messages: any[]) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';
  
  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${channelAccessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`LINE push error: ${res.status} ${text}`);
  }
}

export async function POST(req: Request) {
  try {
    // セキュリティチェック（GitHub Actionsからの正当な呼び出しであることを確認）
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    // 1. 全ユーザーの取得
    const { data: users } = await supabase
      .from('users')
      .select('user_id, line_user_id');

    if (!users) return new Response('No users', { status: 200 });

    for (const user of users) {
      if (!user.line_user_id) continue;

      // 2. 各ユーザーの有効な習慣を最大3つ取得
      const { data: habits } = await supabase
        .from('habits')
        .select('habit_id, goal_text')
        .eq('user_id', user.user_id)
        .eq('is_active', true)
        .limit(3);

      if (!habits || habits.length === 0) continue;

      // 3. 通知メッセージ（ボタン）の作成
      const messages = habits.map((habit) => ({
        type: 'template',
        altText: `20:00の通知: ${habit.goal_text}`,
        template: {
          type: 'buttons',
          text: `20:00になりました！\n${habit.goal_text} はどうでしたか？`,
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
              displayText: `${habit.goal_text}: やっない`
            }
          ]
        }
      }));

      // 4. LINEに送信 (Push APIを使用)
      await pushToLine(user.line_user_id, messages);
    }

    return new Response('Success', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
