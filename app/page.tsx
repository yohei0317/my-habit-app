import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface HomeProps {
  searchParams: { month?: string; year?: string };
}

export default async function Home({ searchParams }: HomeProps) {
  const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
  const currentYear = jstNow.getUTCFullYear();
  const currentMonth = jstNow.getUTCMonth() + 1;

  const displayYear = searchParams.year ? parseInt(searchParams.year) : currentYear;
  const displayMonth = searchParams.month ? parseInt(searchParams.month) : currentMonth;

  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  const { data: files } = await supabase.storage.from('goal-images').list('', {
    limit: 1, sortBy: { column: 'created_at', order: 'desc' },
  });
  const goalImageUrl = files?.[0]?.name 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}`
    : null;

  const getHabitData = async (habitId: string) => {
    // ログ取得：その月の全データを取得してアプリ側で日付判定する
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('logged_date')
      .eq('habit_id', habitId)
      .eq('status', true); // スクショの TRUE に対応

    // ログの日付を文字列のセットにする
    const doneDates = new Set(logs?.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      // データベースの 2026-06-14 という形式と完全に一致する文字列を作る
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, done: doneDates.has(dateStr) };
    });

    return { calendar, streak: logs?.length || 0 };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#333', textDecoration: 'none', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '20px', backgroundColor: '#fff' }}>👤 設定変更</a>
      </header>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #eee' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{displayYear}年 {displayMonth}月</h2>
      </div>

      <section style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '10px', textAlign: 'center', marginBottom: '30px', backgroundColor: '#fff' }}>
        {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }} alt="目標" /> : <p>写真をアップしてください</p>}
      </section>

      {await Promise.all((habits || []).map(async (habit) => {
        const { calendar, streak } = await getHabitData(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 15px 0', borderLeft: '5px solid #ff8c00', paddingLeft: '10px', fontSize: '1.1rem' }}>✨ {habit.goal_text}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', textAlign: 'center', marginBottom: '20px' }}>
              {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '0.7rem', color: '#999' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '35px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.85rem', borderRadius: '4px',
                  backgroundColor: d.done ? '#fff9f0' : '#fff'
                }}>
                  <span style={{ color: d.done ? '#ccc' : '#333' }}>{d.day}</span>
                  {d.done && (
                    <span style={{ position: 'absolute', color: '#ff8c00', fontSize: '1.8rem', fontWeight: 'bold', top: '50%', left: '50%', transform: 'translate(-50%, -55%)' }}>○</span>
                  )}
                </div>
              ))}
            </div>
            <div style={{ background: '#fff5f0', padding: '12px', borderRadius: '8px', textAlign: 'center', border: '1px solid #ffe0d0' }}>
              今月の達成：<strong style={{ fontSize: '1.2rem', color: '#ff4500' }}>{streak}日</strong>
            </div>
          </div>
        );
      }))}
    </main>
  );
}
