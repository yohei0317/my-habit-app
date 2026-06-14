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

  const targetDays = 90;
  const goalTotalMins = targetDays * 45;
  const progressPercent = Math.min(Math.round((totalMinutes / goalTotalMins) * 100), 100);

  // 月移動用
  const prevDate = new Date(Date.UTC(displayYear, displayMonth - 2, 1));
  const nextDate = new Date(Date.UTC(displayYear, displayMonth, 1));

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
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', fontFamily: '"Inter", "system-ui", -apple-system, sans-serif', backgroundColor: '#FFFFFF', minHeight: '100vh', color: '#1A1A1A' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
        <h1 style={{ margin: 0, fontSize: '2.4rem', fontWeight: 950, letterSpacing: '-0.06em', color: '#000', fontStyle: 'italic' }}>MOTIVATOR</h1>
        <a href="/setup" style={{ fontSize: '0.75rem', color: '#000', textDecoration: 'none', padding: '10px 20px', borderRadius: '12px', border: '2px solid #000', fontWeight: 800, backgroundColor: '#FFF' }}>SETTINGS</a>
      </header>

      {/* 1. GOAL PHOTO */}
      <section style={{ marginBottom: '25px' }}>
        <div style={{ borderRadius: '28px', overflow: 'hidden', backgroundColor: '#F3F4F6', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
          {goalImageUrl ? (
            <img src={goalImageUrl} style={{ width: '100%', display: 'block', maxHeight: '220px', objectFit: 'cover' }} alt="Goal" />
          ) : (
            <div style={{ padding: '60px', textAlign: 'center', color: '#999' }}>No Image Set</div>
          )}
        </div>
        <h2 style={{ marginTop: '20px', fontSize: '1.4rem', fontWeight: 900, textAlign: 'center', color: '#000', letterSpacing: '-0.02em' }}>
          「TOEFL 90点取得！3か月後の会議で勝つ」
        </h2>
      </section>

      {/* 2. TOTAL EFFORT & PROGRESS (HORIZONTAL) */}
      <section style={{ display: 'flex', gap: '14px', marginBottom: '45px' }}>
        <div style={{ flex: '0 0 130px', backgroundColor: '#000', borderRadius: '24px', color: '#FFF', padding: '22px 15px', textAlign: 'center' }}>
          <span style={{ fontSize: '0.6rem', fontWeight: 800, opacity: 0.5, letterSpacing: '0.15em', display: 'block', marginBottom: '5px' }}>TOTAL</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 950, lineHeight: 1 }}>{totalMinutes.toLocaleString()}</div>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#FF8C00' }}>mins</span>
        </div>

        <div style={{ flex: 1, backgroundColor: '#000', borderRadius: '24px', color: '#FFF', padding: '22px 25px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, opacity: 0.5, letterSpacing: '0.15em' }}>PROGRESS</span>
            <span style={{ fontSize: '1.2rem', fontWeight: 950, color: '#FF8C00' }}>{progressPercent}%</span>
          </div>
          <div style={{ height: '10px', width: '100%', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#FF8C00', borderRadius: '10px', boxShadow: '0 0 20px rgba(255,140,0,0.5)' }}></div>
          </div>
        </div>
      </section>

      {/* 3. MONTH SELECTOR (ENHANCED PRESENCE) */}
      <nav style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px', marginBottom: '40px', padding: '15px', backgroundColor: '#F8F9FA', borderRadius: '20px' }}>
        <a href={`/?year=${prevDate.getUTCFullYear()}&month=${prevDate.getUTCMonth() + 1}`} style={{ textDecoration: 'none', color: '#000', fontSize: '1.5rem', fontWeight: 900 }}>←</a>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', fontWeight: 950, letterSpacing: '-0.05em', lineHeight: 1 }}>{displayYear}.{displayMonth}</div>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#FF8C00', marginTop: '4px', letterSpacing: '0.2em' }}>MONTHLY LOG</div>
        </div>
        <a href={`/?year=${nextDate.getUTCFullYear()}&month=${nextDate.getUTCMonth() + 1}`} style={{ textDecoration: 'none', color: '#000', fontSize: '1.5rem', fontWeight: 900 }}>→</a>
      </nav>

      {/* 4. HABIT CARDS */}
      {habits?.map((habit) => {
        const calendar = getHabitCalendar(habit.habit_id);
        const streak = calculateStreak(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '45px', padding: '30px', backgroundColor: '#FFF', borderRadius: '32px', border: '1px solid #F0F0F0', boxShadow: '0 10px 40px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 24px 0', fontSize: '1.2rem', fontWeight: 900, borderLeft: '6px solid #FF8C00', paddingLeft: '16px', letterSpacing: '-0.01em' }}>{habit.goal_text}</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '25px' }}>
              {['S','M','T','W','T','F','S'].map((d, i) => <div key={i} style={{ fontSize: '0.7rem', color: '#BBB', fontWeight: 900, marginBottom: '5px' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '46px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '1rem', fontWeight: 800, borderRadius: '14px',
                  backgroundColor: d.done ? '#FFF4E5' : '#F9FAFB', 
                  color: d.done ? '#FF8C00' : '#E5E7EB'
                }}>
                  {d.day}
                  {d.done && <div style={{ position: 'absolute', width: '38px', height: '38px', border: '3px solid #FF8C00', borderRadius: '50%', opacity: 0.4 }}></div>}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: '#000', padding: '10px 24px', borderRadius: '50px', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.1rem' }}>🔥</span>
                <span style={{ fontWeight: 900, fontSize: '0.9rem', color: '#FFF', letterSpacing: '0.02em' }}>{streak} DAYS STREAK</span>
              </div>
            </div>
          </div>
        );
      })}

      <footer style={{ marginTop: '60px', paddingBottom: '50px' }}>
        <a href={`https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '24px', fontWeight: 900, fontSize: '1.1rem', boxShadow: '0 15px 30px rgba(6,199,85,0.2)' }}>
          お友達にアプリを紹介する ➔
        </a>
      </footer>
    </main>
  );
}
