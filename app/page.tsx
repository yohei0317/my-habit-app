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

  // 1. データの取得
  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  const { data: files } = await supabase.storage.from('goal-images').list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  const goalImageUrl = files?.[0]?.name ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}` : null;

  // 2. 累計努力時間の計算 (全期間の総和)
  const { data: allDoneLogs } = await supabase.from('daily_logs').select('duration, logged_date, habit_id').eq('status', true);
  const totalMinutes = allDoneLogs?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  // 3. バロメーター計算 (目標90日 × 3習慣の総和目安)
  const targetDays = 90;
  const goalTotalMins = targetDays * 45; // 1日45分×90日を100%とする
  const progressPercent = Math.min(Math.round((totalMinutes / goalTotalMins) * 100), 100);

  // 4. 連続日数計算
  const calculateStreak = (habitId: string) => {
    const dates = new Set((allDoneLogs || []).filter(l => l.habit_id === habitId).map(l => l.logged_date));
    let streak = 0;
    let checkDate = new Date(jstNow);
    while (true) {
      const s = checkDate.toISOString().split('T')[0];
      if (dates.has(s)) { streak++; checkDate.setDate(checkDate.getDate() - 1); }
      else {
        if (streak === 0 && s === jstNow.toISOString().split('T')[0]) { checkDate.setDate(checkDate.getDate() - 1); continue; }
        break;
      }
    }
    return streak;
  };

  const getHabitCalendar = (habitId: string) => {
    const startStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-01`;
    const endStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-31`;
    const monthLogs = (allDoneLogs || []).filter(l => l.habit_id === habitId && l.logged_date >= startStr && l.logged_date <= endStr);
    const doneDates = new Set(monthLogs.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      return { day: d, done: doneDates.has(dateStr) };
    });
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Helvetica Neue", Arial, sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#333' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 900, color: '#FF8C00', letterSpacing: '0.05em' }}>🔥 MOTIVATOR</h1>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', padding: '8px 16px', borderRadius: '50px', border: '1px solid #E0E0E0', backgroundColor: '#FFF' }}>⚙️ SETTINGS</a>
      </header>

      {/* ⏳ Total Effort Bar (Top Priority) */}
      <section style={{ marginBottom: '35px', padding: '25px', backgroundColor: '#FFF', borderRadius: '24px', boxShadow: '0 8px 20px rgba(0,0,0,0.04)', border: '1px solid #F0F0F0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#999', letterSpacing: '0.05em' }}>TOTAL EFFORT</span>
          <span style={{ fontSize: '1.8rem', fontWeight: 900, color: '#FF8C00' }}>{totalHours}<small style={{fontSize: '0.9rem', fontWeight: 600}}>h</small> {remainingMins}<small style={{fontSize: '0.9rem', fontWeight: 600}}>m</small></span>
        </div>
        <div style={{ height: '14px', width: '100%', backgroundColor: '#F0F0F0', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#FF8C00', transition: 'width 1.5s ease-out' }}></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.8rem', color: '#AAA', fontWeight: 600 }}>{progressPercent}% ACHIEVED</div>
      </section>

      {/* Goal Visual & Slogan */}
      <section style={{ marginBottom: '45px', textAlign: 'center' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.08)', backgroundColor: '#FFF', padding: '8px' }}>
          {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', borderRadius: '14px', display: 'block' }} alt="Goal" /> : <div style={{ padding: '50px', color: '#CCC' }}>Please upload a goal photo</div>}
        </div>
        <h2 style={{ marginTop: '25px', fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.4 }}>「TOEFL 90点取得！3か月後の会議で勝つ」</h2>
      </section>

      <div style={{ textAlign: 'center', marginBottom: '25px', fontSize: '1.1rem', fontWeight: 800, color: '#555' }}>{displayYear} / {displayMonth}</div>

      {/* Individual Habit Calendars */}
      {habits?.map((habit, index) => {
        const calendar = getHabitCalendar(habit.habit_id);
        const streak = calculateStreak(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '35px', padding: '25px', backgroundColor: '#FFF', borderRadius: '24px', border: '1px solid #F0F0F0', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, borderLeft: '5px solid #FF8C00', paddingLeft: '12px', fontSize: '1.1rem', fontWeight: 800 }}>{habit.goal_text}</h3>
              <div style={{ backgroundColor: '#FFF4E5', padding: '4px 12px', borderRadius: '50px' }}>
                <span style={{ color: '#FF8C00', fontWeight: 800, fontSize: '0.85rem' }}>🔥 {streak} DAYS STREAK</span>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: '0.65rem', color: '#DDD', fontWeight: 900, marginBottom: '5px' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.9rem', fontWeight: 700, borderRadius: '10px',
                  backgroundColor: d.done ? '#FFF4E5' : '#FAFAFA', color: d.done ? '#FF8C00' : '#444'
                }}>
                  {d.day}
                  {d.done && <div style={{ position: 'absolute', width: '32px', height: '32px', border: '2.5px solid #FF8C00', borderRadius: '50%', opacity: 0.35 }}></div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Footer Share Button */}
      <div style={{ marginTop: '60px', paddingBottom: '20px' }}>
        <a href="https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '20px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '1.05rem', boxShadow: '0 8px 20px rgba(6,199,85,0.2)' }}>
          お友達にアプリを紹介する ➔
        </a>
      </div>
    </main>
  );
}
