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
      // 1. 「今日の記録」メッセージ対応（Flex Message版）
      if (event.type === 'message' && event.message.text === '今日の記録') {
        const { data: user } = await supabase.from('users').select('user_id').eq('line_user_id', event.source.userId).single();
        if (!user) continue;

        const { data: habits } = await supabase.from('habits').select('habit_id, goal_text').eq('user_id', user.user_id).eq('is_active', true).limit(3);
        if (!habits || habits.length === 0) continue;

        // スクショを再現した Flex Message の構成
        const flexContents = habits.map((h, i) => ([
          { type: "text", text: `${i + 1}. ${h.goal_text}`, size: "sm", color: "#666666", margin: "md" },
          {
            type: "box", layout: "horizontal", spacing: "md", margin: "sm",
            contents: [
              {
                type: "button", height: "sm", style: "secondary", color: "#E8F5E9",
                action: { type: "postback", label: "✓ やった", data: JSON.stringify({ habitId: h.habit_id, isDone: true, title: h.goal_text }), displayText: `${h.goal_text}: やった` }
              },
              {
                type: "button", height: "sm", style: "secondary", color: "#F5F5F5",
                action: { type: "postback", label: "× 未達成", data: JSON.stringify({ habitId: h.habit_id, isDone: false, title: h.goal_text }), displayText: `${h.goal_text}: 未達成` }
              }
            ]
          }
        ])).flat();

        const message = {
          type: "flex",
          altText: "今日の習慣チェック",
          contents: {
            type: "bubble",
            body: {
              type: "box", layout: "vertical",
              contents: [
                { type: "text", text: "📅 今日の習慣チェック", weight: "bold", size: "lg" },
                { type: "separator", margin: "md" },
                ...flexContents,
                { type: "separator", margin: "xl" },
                { type: "text", text: "🔥 今日も積み上げましょう！", size: "xs", color: "#aaaaaa", margin: "md", textAlign: "center" }
              ]
            }
          }
        };

        await replyToLine(event.replyToken, [message]);
      }

      // 2. ボタン押下（postback）対応
      if (event.type === 'postback') {
        const parsed = JSON.parse(event.postback.data);
        const { data: user } = await supabase.from('users').select('user_id').eq('line_user_id', event.source.userId).single();
        
        if (user) {
          const jstDate = new Date(new Date().getTime() + (9 * 60 * 60 * 1000)).toISOString().split('T')[0];
          await supabase.from('daily_logs').insert({
            user_id: user.user_id,
            habit_id: parsed.habitId,
            status: parsed.isDone,
            logged_date: jstDate
          });
          // 応答はシンプルに
          await replyToLine(event.replyToken, [{ type: 'text', text: `「${parsed.title}」を記録しました！` }]);
        }
      }
    }
    return new Response('OK', { status: 200 });
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
