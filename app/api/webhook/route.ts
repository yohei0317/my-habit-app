export const runtime = 'nodejs';

import * as line from '@line/bot-sdk';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

const client = line.LineBotClient.fromChannelAccessToken({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const events = body?.events || [];

    await Promise.all(events.map((event: any) => handleEvent(event)));

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
}

async function handleEvent(event: any) {
  // 1) ユーザーが「今日の記録」と送ったとき
  if (event.type === 'message' && event.message?.type === 'text') {
    const text = (event.message.text || '').trim();

    if (text !== '今日の記録') {
      return;
    }

    const lineUserId = event.source?.userId;
    const replyToken = event.replyToken;

    if (!lineUserId || !replyToken) {
      return;
    }

    // users テーブルからユーザー取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError || !user) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: 'まだユーザー連携が完了していません。Supabase の users テーブルに line_user_id を登録してください。',
          } as any,
        ],
      });
      return;
    }

    // habits テーブルから最初の習慣を1件取得
    const { data: habit, error: habitError } = await supabase
      .from('habits')
      .select('id, title')
      .eq('user_id', user.user_id)
      .limit(1)
      .maybeSingle();

    if (habitError || !habit) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: 'まだ習慣が登録されていません。Supabase の habits テーブルを確認してください。',
          } as any,
        ],
      });
      return;
    }

    const buttonsMessage = {
      type: 'template',
      altText: '今日の記録',
      template: {
        type: 'buttons',
        text: `${habit.title || 'この習慣'} は今日はやりましたか？`,
        actions: [
          {
            type: 'postback',
            label: 'やった',
            data: JSON.stringify({
              habitId: habit.id,
              status: true,
            }),
            displayText: 'やった',
          },
          {
            type: 'postback',
            label: 'やってない',
            data: JSON.stringify({
              habitId: habit.id,
              status: false,
            }),
            displayText: 'やってない',
          },
        ],
      },
    };

    await client.replyMessage({
      replyToken,
      messages: [buttonsMessage as any],
    });

    return;
  }

  // 2) ボタン（postback）を押したとき
  if (event.type === 'postback') {
    const lineUserId = event.source?.userId;
    const replyToken = event.replyToken;

    if (!lineUserId || !replyToken) {
      return;
    }

    let payload: { habitId?: string; status?: boolean } = {};
    try {
      payload = JSON.parse(event.postback?.data || '{}');
    } catch {
      payload = {};
    }

    if (!payload.habitId) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '記録データの読み取りに失敗しました。',
          } as any,
        ],
      });
      return;
    }

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('user_id')
      .eq('line_user_id', lineUserId)
      .single();

    if (userError || !user) {
      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: 'ユーザー情報が見つかりませんでした。',
          } as any,
        ],
      });
      return;
    }

    const today = new Date().toISOString().split('T')[0];

    const { error: insertError } = await supabase.from('daily_logs').insert({
      user_id: user.user_id,
      habit_id: payload.habitId,
      status: payload.status,
      logged_date: today,
    });

    if (insertError) {
      console.error(insertError);

      await client.replyMessage({
        replyToken,
        messages: [
          {
            type: 'text',
            text: '保存に失敗しました。Supabase の daily_logs テーブル構成を確認してください。',
          } as any,
        ],
      });
      return;
    }

    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: payload.status
            ? '記録しました！「やった」で保存しました。'
            : '記録しました！「やってない」で保存しました。',
        } as any,
      ],
    });

    return;
  }

  return;
}
