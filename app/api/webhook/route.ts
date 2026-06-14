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
    body: JSON.stringify({
      replyToken,
      messages,
    }),
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
      // 1) 「今日の記録」メッセージへの応答
      if (
        event.type === 'message' &&
        event.message.type === 'text' &&
        event.message.text === '今日の記録'
      ) {
        const lineUserId = event.source.userId;

        if (!lineUserId) {
          await replyToLine(event.replyToken, [
            { type: 'text', text: 'userId を取得できませんでした。' },
          ]);
          continue;
        }

        // ユーザー取得
        const { data: user, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId)
          .single();

        if (userError || !user) {
          await replyToLine(event.replyToken, [
            { type: 'text', text: `まだユーザー連携が完了していません。line_user_id: ${lineUserId}` },
          ]);
          continue;
        }

        // 習慣取得 (カラム名を habit_id, goal_text に修正)
        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('habit_id, goal_text')
          .eq('user_id', user.user_id)
          .eq('is_active', true)
          .limit(1);

        const habit = habits?.[0];

        if (habitsError || !habit) {
          await replyToLine(event.replyToken, [
            { type: 'text', text: 'まだ習慣が登録されていません。Supabase の habits テーブルを確認してください。' },
          ]);
          continue;
        }

        // ボタンテンプレート送信
        await replyToLine(event.replyToken, [
          {
            type: 'template',
            altText: '今日の記録',
            template: {
              type: 'buttons',
              text: `${habit.goal_text} は今日はどうでしたか？`,
              actions: [
                {
                  type: 'postback',
                  label: 'やった',
                  data: JSON.stringify({
                    habitId: habit.habit_id,
                    status: 'done',
                  }),
                  displayText: 'やった',
                },
                {
                  type: 'postback',
                  label: 'やってない',
                  data: JSON.stringify({
                    habitId: habit.habit_id,
                    status: 'not_done',
                  }),
                  displayText: 'やってない',
                },
              ],
            },
          },
        ]);
        continue;
      }

      // 2) ボタン押下（postback）時の処理
      if (event.type === 'postback') {
        const lineUserId = event.source.userId;
        let parsedData: { habitId?: string; status?: string } = {};

        try {
          parsedData = JSON.parse(event.postback.data || '{}');
        } catch {
          continue;
        }

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

          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: parsedData.status === 'done' ? '記録しました！お疲れ様です✨' : '記録しました。明日は頑張りましょう！',
            },
          ]);
        }
        continue;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
