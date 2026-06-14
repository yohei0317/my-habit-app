import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const dynamic = 'force-dynamic';

interface HomeProps {
  searchParams: { month?: string; year?: string };
}

export default async function Home({ searchParams }: HomeProps) {
  // 日本時間での現在時刻
  const now = new Date();
  const jstNow = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  
  // 表示する年月の決定（URLパラメータがあれば優先、なければ今月）
  const displayYear = searchParams.year ? parseInt(searchParams.year) : jstNow.getUTCFullYear();
  const displayMonth = searchParams.month ? parseInt(searchParams.month) - 1 : jstNow.getUTCMonth();

  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  
  const { data: files } = await supabase.storage.from('goal-images').list('', {
    limit: 1,
    sortBy: { column: 'created_at', order: 'desc' },
  });
  const goalImageUrl = files?.[0]?.name 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}`
    : null;

  // 月移動のリンク生成
  const prevMonth = displayMonth === 0 ? 12 : displayMonth;
  const prevYear = displayMonth === 0 ? displayYear - 1 : displayYear;
  const nextMonth = displayMonth === 11 ? 1 : displayMonth + 2;
  const nextYear = displayMonth === 11 ? displayYear + 1 : displayYear;

  const getHabitData = async (habitId: string) => {
    const startDate = new Date(Date.UTC(displayYear, displayMonth, 1)).toISOString().split('T')[0];
    const endDate = new Date(Date.UTC(displayYear, displayMonth + 1, 0)).toISOString().split('T')[0];
    
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('logged_date')
      .eq('habit_id', habitId)
      .eq('status', 'done')
      .gte('logged_date', startDate)
      .lte('logged_date', endDate);

    const doneDates = new Set(logs?.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth + 1, 0).getDate();
    
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = new Date(Date.UTC(displayYear, displayMonth, i + 1)).toISOString().split('T')[0];
      return { day: i + 1, done: doneDates.has(dateStr) };
    });

    return { calendar, streak: logs?.length || 0 };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#333', textDecoration: 'none', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '20px', backgroundColor: '#fff' }}>
          👤 設定変更
        </a>
      </header>

      {/* 月切り替えナビゲーション */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #eee' }}>
        <a href={`/?year=${prevYear}&month=${prevMonth}`} style={{ textDecoration: 'none', fontSize: '1.2rem', color: '#ff8c00' }}>◀</a>
        <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{displayYear}年 {displayMonth + 1}月</h2>
        <a href={`/?year=${nextYear}&month=${nextMonth}`} style={{ textDecoration: 'none', fontSize: '1.2rem', color: '#ff8c00' }}>▶</a>
      </div>

      <section style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '10px', textAlign: 'center', marginBottom: '30px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} alt="目標" /> : <p>設定画面から目標写真をアップしてください</p>}
      </section>

      {await Promise.all((habits || []).map(async (habit) => {
        const { calendar, streak } = await getHabitData(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 15px 0', borderLeft: '5px solid #ff8c00', paddingLeft: '10px', fontSize: '1.1rem' }}>✨ {habit.goal_text}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '20px' }}>
              {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '0.7rem', color: '#999', paddingBottom: '5px' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '35px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.85rem', borderRadius: '4px',
                  backgroundColor: d.done ? '#fff9f0' : '#fff'
                }}>
                  <span style={{ color: d.done ? '#ccc' : '#333' }}>{d.day}</span>
                  {d.done && (
                    <span style={{ 
                      position: 'absolute', color: '#ff8c00', fontSize: '1.8rem', fontWeight: 'bold', lineHeight: 1, top: '50%', left: '50%', transform: 'translate(-50%, -55%)', opacity: 0.8
                    }}>○</span>
                  )}
                </div>
              ))}
            </div>

            <div style={{ background: '#fff5f0', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ffe0d0' }}>
              この月の達成：<strong style={{ fontSize: '1.2rem', color: '#ff4500' }}>{streak}日</strong>
            </div>
          </div>
        );
      }))}
    </main>
  );
}
