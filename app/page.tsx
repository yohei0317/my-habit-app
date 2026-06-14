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

  const { data: allDoneLogs } = await supabase.from('daily_logs').select('duration, logged_date, habit_id').eq('status', true);
  const totalMinutes = allDoneLogs?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  const targetDays = 90;
  const goalTotalMins = targetDays * 45;
  const progressPercent = Math.min(Math.round((totalMinutes / goalTotalMins) * 100), 100);

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
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', fontFamily: 'Inter, -apple-system, sans-serif', backgroundColor: '#FFFFFF', minHeight: '100vh', color: '#1A1A1A' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', color: '#000' }}>MOTIVATOR</h1>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', padding: '10px 20px', borderRadius: '12px', border: '1px solid #EEE', fontWeight: 700, backgroundColor: '#FAFAFA' }}>SETTINGS</a>
      </header>

      {/* 1. GOAL PHOTO (TOP) */}
      <section style={{ marginBottom: '30px' }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', backgroundColor: '#F3F4F6' }}>
          {goalImageUrl ? (
            <img src={goalImageUrl} style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'cover' }} alt="Goal" />
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>No Image Set</div>
          )}
        </div>
        <h2 style={{ marginTop: '20px', fontSize: '1.25rem', fontWeight: 800, textAlign: 'center', color: '#000', lineHeight: 1.4 }}>
          「TOEFL 90点取得！3か月後の会議で勝つ」
        </h2>
      </section>

      {/* 2. TOTAL EFFORT CARD */}
      <section style={{ marginBottom: '15px', backgroundColor: '#000', borderRadius: '24px', color: '#FFF', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5, letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>TOTAL EFFORT</span>
        <div style={{ fontSize: '3.2rem', fontWeight: 900, lineHeight: 1 }}>
          {totalHours}<span style={{ fontSize: '1.4rem', opacity: 0.6, marginLeft: '4px' }}>h</span> {remainingMins}<span style={{ fontSize: '1.4rem', opacity: 0.6, marginLeft: '4px' }}>m</span>
        </div>
      </section>

      {/* 3. PROGRESS BAR CARD (SEPARATED) */}
      <section style={{ marginBottom: '40px', backgroundColor: '#000', borderRadius: '24px', color: '#FFF', padding: '25px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '12px' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, opacity: 0.5 }}>GOAL PROGRESS</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 900, color: '#FF8C00' }}>{progressPercent}%</span>
        </div>
        <div style={{ height: '12px', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#FF8C00', borderRadius: '10px' }}></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '10px', fontSize: '0.7rem', opacity: 0.4 }}>Target: {targetDays} Days</div>
      </section>

      {/* 4. DATE DISPLAY */}
      <div style={{ fontSize: '1.2rem', fontWeight: 900, textAlign: 'center', marginBottom: '30px', color: '#1A1A1A' }}>{displayYear} . {displayMonth}</div>

      {/* 5. CALENDARS WITH STREAK BELOW */}
      {habits?.map((habit) => {
        const calendar = getHabitCalendar(habit.habit_id);
        const streak = calculateStreak(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '25px', backgroundColor: '#FFF', borderRadius: '28px', border: '1px solid #F3F4F6', boxShadow: '0 4px 15px rgba(0,0,0,0.02)' }}>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '1.1rem', fontWeight: 800, borderLeft: '5px solid #FF8C00', paddingLeft: '12px' }}>{habit.goal_text}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '20px' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: '0.65rem', color: '#DDD', fontWeight: 900, marginBottom: '4px' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.95rem', fontWeight: 700, borderRadius: '12px',
                  backgroundColor: d.done ? '#FFF4E5' : '#F9FAFB', 
                  color: d.done ? '#FF8C00' : '#D1D5DB'
                }}>
                  {d.day}
                  {d.done && <div style={{ position: 'absolute', width: '34px', height: '34px', border: '2.5px solid #FF8C00', borderRadius: '50%', opacity: 0.4 }}></div>}
                </div>
              ))}
            </div>

            {/* STREAK MOVED HERE (BELOW CALENDAR) */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: '#F9FAFB', padding: '8px 20px', borderRadius: '50px', border: '1px solid #F0F0F0', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1rem' }}>🔥</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1A1A1A' }}>{streak}日連続達成中</span>
              </div>
            </div>
          </div>
        );
      })}

      <footer style={{ marginTop: '60px', paddingBottom: '40px' }}>
        <a href={`https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '64px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '20px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 10px 25px rgba(6,199,85,0.2)' }}>
          お友達にアプリを紹介する ➔
        </a>
      </footer>
    </main>
  );
}
