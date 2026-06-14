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

  const calculateStreak = (logs: any[]) => {
    const dates = new Set(logs.map(l => l.logged_date));
    let streak = 0;
    let checkDate = new Date(jstNow);
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        if (streak === 0 && dateStr === jstNow.toISOString().split('T')[0]) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const getHabitData = async (habitId: string) => {
    const start = `${displayYear}-${String(displayMonth).padStart(2, '0')}-01`;
    const end = `${displayYear}-${String(displayMonth).padStart(2, '0')}-31`;
    const { data: allLogs } = await supabase.from('daily_logs').select('logged_date').eq('habit_id', habitId).eq('status', true).order('logged_date', { ascending: false });
    const monthLogs = (allLogs || []).filter(l => l.logged_date >= start && l.logged_date <= end);
    const doneDates = new Set(monthLogs.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
      return { day: i + 1, done: doneDates.has(dateStr) };
    });
    return { calendar, streak: calculateStreak(allLogs || []) };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Helvetica Neue", Arial, "Hiragino Kaku Gothic ProN", "Hiragino Sans", Meiryo, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#333' }}>
      {/* ナビゲーションヘッダー */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, letterSpacing: '0.05em' }}>HABIT TRACKER</h1>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', padding: '8px 16px', borderRadius: '50px', border: '1px solid #E0E0E0', backgroundColor: '#FFF', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>⚙️</span> 設定・編集
        </a>
      </header>

      {/* 現在の年月表示 */}
      <div style={{ textAlign: 'center', marginBottom: '25px' }}>
        <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>{displayYear}年 {displayMonth}月</h2>
        <div style={{ width: '40px', height: '3px', background: '#FF8C00', margin: '10px auto' }}></div>
      </div>

      {/* 目標ビジュアルカード */}
      <section style={{ border: 'none', borderRadius: '20px', padding: '12px', textAlign: 'center', marginBottom: '40px', backgroundColor: '#FFF', boxShadow: '0 10px 30px rgba(0,0,0,0.08)' }}>
        {goalImageUrl ? (
          <img src={goalImageUrl} style={{ width: '100%', borderRadius: '14px', objectFit: 'cover', display: 'block' }} alt="Goal" />
        ) : (
          <div style={{ padding: '60px 20px', color: '#AAA' }}>右上のボタンから目標写真を設定しましょう</div>
        )}
      </section>

      {/* 習慣別カレンダーセクション */}
      {await Promise.all((habits || []).map(async (habit, index) => {
        const { calendar, streak } = await getHabitData(habit.habit_id);
        const icons = ['🔥', '📚', '🎯'];
        return (
          <div key={habit.habit_id} style={{ marginBottom: '30px', padding: '25px', backgroundColor: '#FFF', borderRadius: '24px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', border: '1px solid #F0F0F0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: '#999', fontWeight: 600, display: 'block', marginBottom: '4px' }}>HABIT {index + 1}</span>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {icons[index] || '✨'} {habit.goal_text}
                </h3>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: streak >= 21 ? '#FFF4E5' : '#F8F9FA', padding: '4px 12px', borderRadius: '50px', border: streak >= 21 ? '1px solid #FF8C00' : '1px solid #EEE' }}>
                  <span style={{ fontSize: '1rem' }}>{streak >= 21 ? '⭐' : '🔝'}</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: streak >= 21 ? '#FF8C00' : '#333' }}>{streak}日連続</span>
                </div>
              </div>
            </div>
            
            {/* モダンカレンダーグリッド */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => (
                <div key={d} style={{ fontSize: '0.6rem', color: '#CCC', fontWeight: 800, paddingBottom: '5px' }}>{d}</div>
              ))}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '40px', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.85rem', fontWeight: 600, borderRadius: '10px',
                  backgroundColor: d.done ? '#FFF4E5' : '#FAFAFA',
                  color: d.done ? '#FF8C00' : '#444',
                  transition: 'all 0.2s ease'
                }}>
                  {d.day}
                  {d.done && (
                    <div style={{ position: 'absolute', width: '32px', height: '32px', border: '2px solid #FF8C00', borderRadius: '50%', opacity: 0.3 }}></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      }))}

      {/* シェアセクション */}
      <div style={{ marginTop: '50px', padding: '0 10px' }}>
        <a 
          href="https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID" 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '18px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '18px', fontWeight: 700, fontSize: '1rem', boxShadow: '0 4px 15px rgba(6,199,85,0.2)' }}
        >
          <span>💬</span> お友達にアプリを紹介する
        </a>
        <p style={{ fontSize: '0.7rem', color: '#CCC', marginTop: '15px', textAlign: 'center', lineHeight: 1.5 }}>
          © 2026 Habit Tracker App<br />
          積み重ねが未来の自分を作ります
        </p>
      </div>
    </main>
  );
}
