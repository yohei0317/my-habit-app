import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const dynamic = 'force-dynamic';

export default async function Home() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // 1. 全習慣を取得 (最大3つ)
  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  
  // Storageから最新の画像取得
  const { data: files } = await supabase.storage.from('goal-images').list('', {
    limit: 1,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  const goalImageUrl = files?.[0]?.name 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}`
    : null;

  // 2. カレンダーと日数の集計用関数
  const getHabitData = async (habitId: string) => {
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('logged_date')
      .eq('habit_id', habitId)
      .eq('status', 'done')
      .gte('logged_date', startDate);

    const doneDates = new Set(logs?.map(l => l.logged_date));
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = new Date(year, month, i + 1).toISOString().split('T')[0];
      return { day: i + 1, done: doneDates.has(dateStr) };
    });

    return { calendar, streak: logs?.length || 0 };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#333', textDecoration: 'none', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '20px', backgroundColor: '#fff' }}>
          👤 設定変更
        </a>
      </header>

      {/* 共通の目標写真 */}
      <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', textAlign: 'center', marginBottom: '30px', backgroundColor: '#fff' }}>
        {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} alt="目標" /> : <p>写真を設定してください</p>}
      </section>

      {/* 各習慣ごとのセクションを並べる */}
      {await Promise.all((habits || []).map(async (habit) => {
        const { calendar, streak } = await getHabitData(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', paddingBottom: '20px', borderBottom: '2px solid #eee' }}>
            <h3 style={{ borderLeft: '5px solid #ff8c00', paddingLeft: '10px', marginBottom: '10px' }}>✨ {habit.goal_text}</h3>
            
            {/* カレンダー */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center', marginBottom: '15px' }}>
              {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '0.7rem', color: '#999' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ height: '30px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.8rem', backgroundColor: '#fff' }}>
                  {d.day}
                  {d.done && <span style={{ position: 'absolute', color: 'orange', fontSize: '1.2rem', top: '-4px' }}>○</span>}
                </div>
              ))}
            </div>

            {/* 連続記録 */}
            <div style={{ background: '#fff5f0', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ffe0d0' }}>
              今月の達成：<strong>{streak}日</strong>
            </div>
          </div>
        );
      }))}
    </main>
  );
}
