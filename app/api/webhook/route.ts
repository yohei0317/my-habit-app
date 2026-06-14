import { WebhookEvent, MessagingApiClient } from '@line/bot-sdk';
import { supabase } from '@/lib/supabase';

const client = new MessagingApiClient({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN! });

export async function POST(req: Request) {
  const { events } = await req.json() as { events: WebhookEvent[] };

  for (const event of events) {
    if (event.type === 'postback') {
      const data = JSON.parse(event.postback.data); // {habitId: '...', status: true}
      const lineUserId = event.source.userId!;

      // 1. ユーザーID取得
      const { data: user } = await supabase.from('users').select('user_id').eq('line_user_id', lineUserId).single();
      if (!user) continue;

      // 2. ログ保存
      await supabase.from('daily_logs').insert({
        user_id: user.user_id,
        habit_id: data.habitId,
        status: data.status,
        logged_date: new Date().toISOString().split('T')[0]
      });

      // 3. 連続日数チェック & バッジ付与ロジック（簡易版）
      // ※ここに21日判定を入れます
    }
  }
  return new Response('OK');
}
