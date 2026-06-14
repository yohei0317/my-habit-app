import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }: { searchParams: { month?: string; year?: string } }) {
  const jstNow = new Date(new Date().getTime() + (9 * 60 * 60 * 1000));
  const displayYear = searchParams.year ? parseInt(searchParams.year) : jstNow.getUTCFullYear();
  const displayMonth = searchParams.month ? parseInt(searchParams.month) : jstNow.getUTCMonth() + 1;

  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  const { data: files } = await supabase.storage.from('goal-images').list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  const goalImageUrl = files?.[0]?.name ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}` : null;

  const getHabitData = async (habitId: string) => {
    const start = `${displayYear}-${String(displayMonth).padStart(2, '0')}-01`;
    const end = `${displayYear}-${String(displayMonth).padStart(2, '0')}-31`;
    
    const { data: logs } = await supabase.from('daily_logs').select('logged_date').eq('habit_id', habitId).eq('status', 'done').gte('logged_date', start).lte('logged_date', end);
    const doneDates = new Set(logs?.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return { day: i + 1, done: doneDates.has(dateStr) };
    });
    return { calendar, count: logs?.length || 0 };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#333', textDecoration: 'none', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '20px', backgroundColor: '#fff' }}>👤 設定変更</a>
      </header>
      <div style={{ textAlign: 'center', marginBottom: '20px', fontWeight: 'bold' }}>{displayYear}年 {displayMonth}月</div>
      <section style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '10px', textAlign: 'center', marginBottom: '30px', backgroundColor: '#fff' }}>
        {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', maxHeight: '300px', objectFit: 'contain' }} alt="目標" /> : <p>写真を設定してください</p>}
      </section>
      {await Promise.all((habits || []).map(async (habit) => {
        const { calendar, count } = await getHabitData(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee' }}>
            <h3 style={{ margin: '0 0 15px 0', borderLeft: '4px solid #ff8c00', paddingLeft: '10px' }}>✨ {habit.goal_text}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center' }}>
              {calendar.map(d => (
                <div key={d.day} style={{ height: '35px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.8rem', backgroundColor: d.done ? '#fff9f0' : '#fff' }}>
                  {d.day}
                  {d.done && <span style={{ position: 'absolute', color: '#ff8c00', fontSize: '1.8rem', top: '50%', left: '50%', transform: 'translate(-50%, -55%)' }}>○</span>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '15px', textAlign: 'center', fontSize: '0.9rem' }}>今月の達成：<strong>{count}日</strong></div>
          </div>
        );
      }))}
    </main>
  );
}
