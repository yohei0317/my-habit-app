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
    }
  | {
      type: string;
      replyToken?: string;
      source?: { userId?: string };
      message?: { type?: string; text?: string };
      postback?: { data?: string };
    };

type WebhookBody = {
  events: LineEvent[];
};

async function replyToLine(replyToken: string, messages: any[]) {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN が未設定です');
  }

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

function todayJstLikeIsoDate() {
  return new Date().toISOString().split('T')[0];
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WebhookBody;
    const events = body.events || [];

    for (const event of events) {
      // 1) 「今日の記録」と送られたらボタンを返す
      if (
        event.type === 'message' &&
        event.message?.type === 'text' &&
        event.message.text === '今日の記録'
      ) {
        const lineUserId = event.source?.userId;

        if (!lineUserId) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'userId を取得できませんでした。1対1トークで試してください。',
            },
          ]);
          continue;
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId)
          .single();

        if (userError || !user) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'まだユーザー連携が完了していません。Supabase の users テーブルに line_user_id を登録してください。',
            },
          ]);
          continue;
        }

        const { data: habits, error: habitsError } = await supabase
          .from('habits')
          .select('id,title')
          .eq('user_id', user.user_id)
          .limit(1);

        const habit = habits?.[0];

        if (habitsError || !habit) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'まだ習慣が登録されていません。Supabase の habits テーブルを確認してください。',
            },
          ]);
          continue;
        }

        await replyToLine(event.replyToken, [
          {
            type: 'template',
            altText: '今日の記録',
            template: {
              type: 'buttons',
              text: `${habit.title} は今日はどうでしたか？`,
              actions: [
                {
                  type: 'postback',
                  label: 'やった',
                  data: JSON.stringify({
                    habitId: habit.id,
                    status: 'done',
                  }),
                  displayText: 'やった',
                },
                {
                  type: 'postback',
                  label: 'やってない',
                  data: JSON.stringify({
                    habitId: habit.id,
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

      // 2) postback を受け取ったら daily_logs に保存
      if (event.type === 'postback') {
        const lineUserId = event.source?.userId;

        if (!lineUserId) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'userId を取得できませんでした。',
            },
          ]);
          continue;
        }

        let parsedData: { habitId?: string | number; status?: string } = {};

        try {
          parsedData = JSON.parse(event.postback?.data || '{}');
        } catch {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'postback データの解析に失敗しました。',
            },
          ]);
          continue;
        }

        const { data: user, error: userError } = await supabase
          .from('users')
          .select('user_id')
          .eq('line_user_id', lineUserId)
          .single();

        if (userError || !user) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: 'ユーザー連携が見つかりませんでした。',
            },
          ]);
          continue;
        }

        const { error: insertError } = await supabase.from('daily_logs').insert({
          user_id: user.user_id,
          habit_id: parsedData.habitId,
          status: parsedData.status,
          logged_date: todayJstLikeIsoDate(),
        });

        if (insertError) {
          await replyToLine(event.replyToken, [
            {
              type: 'text',
              text: '保存に失敗しました。daily_logs テーブル設定を確認してください。',
            },
          ]);
          continue;
        }

        await replyToLine(event.replyToken, [
          {
            type: 'text',
            text:
              parsedData.status === 'done'
                ? '記録しました！「やった」で保存しました。'
                : '記録しました！「やってない」で保存しました。',
          },
        ]);

        continue;
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}
