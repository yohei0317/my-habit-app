import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const dynamic = 'force-dynamic';

export default async function Home() {
  // 1. 全習慣を取得 (最大3つ)
  const { data: habits } = await supabase
    .from('habits')
    .select('habit_id, goal_text')
    .eq('is_active', true)
    .limit(3);

  // 2. 習慣ごとに達成状況を計算
  const habitStats = await Promise.all((habits || []).map(async (habit) => {
    // 過去のログを取得して「やった」の数を数える
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('status')
      .eq('habit_id', habit.habit_id)
      .eq('status', 'done');
    
    return {
      title: habit.goal_text,
      count: logs?.length || 0
    };
  }));

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ textAlign: 'center' }}>🏆 習慣化ダッシュボード</h1>
      <p style={{ textAlign: 'center', color: '#666' }}>現在の進捗状況</p>
      <hr />
      
      {habitStats.length > 0 ? (
        habitStats.map((stat, index) => (
          <div key={index} style={{ 
            background: '#f9f9f9', 
            padding: '15px', 
            borderRadius: '10px', 
            marginBottom: '15px',
            border: '1px solid #eee'
          }}>
            <h3 style={{ margin: '0 0 10px 0' }}>✨ {stat.title}</h3>
            <p style={{ fontSize: '1.2rem', margin: 0 }}>
              これまでの合計達成：<strong>{stat.count}日</strong>
            </p>
          </div>
        ))
      ) : (
        <p style={{ textAlign: 'center' }}>習慣が登録されていません。</p>
      )}

      <footer style={{ marginTop: '30px', textAlign: 'center', fontSize: '0.8rem', color: '#aaa' }}>
        LINEで記録するとここに反映されます
      </footer>
    </main>
  );
}
