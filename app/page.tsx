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
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: '"Inter", "Noto Sans JP", sans-serif', backgroundColor: '#F8F9FC', minHeight: '100vh', color: '#1E293B' }}>
      
      {/* HEADER */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: '#1E293B', letterSpacing: '-0.02em' }}>MOTIVATOR</h1>
        <a href="/setup" style={{ fontSize: '0.85rem', color: '#64748B', textDecoration: 'none', padding: '10px 24px', borderRadius: '16px', backgroundColor: '#FFF', border: '1px solid #E2E8F0', fontWeight: 600, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
          ⚙️ 設定・編集
        </a>
      </header>

      {/* 1. GOAL PHOTO (TOP) - Large Rounding */}
      <section style={{ marginBottom: '32px' }}>
        <div style={{ borderRadius: '24px', overflow: 'hidden', backgroundColor: '#FFF', padding: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)' }}>
          {goalImageUrl ? (
            <img src={goalImageUrl} style={{ width: '100%', borderRadius: '20px', display: 'block', maxHeight: '300px', objectFit: 'cover' }} alt="Goal" />
          ) : (
            <div style={{ padding: '80px 20px', textAlign: 'center', color: '#94A3B8' }}>No Image Set</div>
          )}
        </div>
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: '#1E293B' }}>
            「TOEFL 90点取得！3か月後の会議で勝つ」
          </h2>
        </div>
      </section>

      {/* 2. TOTAL & PROGRESS (HORIZONTAL) - Clean Modern Style */}
      <section style={{ display: 'flex', gap: '20px', marginBottom: '48px', alignItems: 'stretch' }}>
        {/* Total Mins */}
        <div style={{ flex: '0 0 160px', backgroundColor: '#FFF', borderRadius: '24px', padding: '24px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.1em', display: 'block', marginBottom: '8px' }}>TOTAL EFFORT</span>
          <div style={{ fontSize: '2.2rem', fontWeight: 800, color: '#E84A4A', lineHeight: 1 }}>{totalMinutes.toLocaleString()}</div>
          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94A3B8' }}>mins</span>
        </div>

        {/* Progress Bar Card */}
        <div style={{ flex: 1, backgroundColor: '#FFF', borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.1em' }}>GOAL PROGRESS</span>
            <div style={{ backgroundColor: '#FFECEC', color: '#E84A4A', padding: '4px 12px', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 800 }}>{progressPercent}%</div>
          </div>
          <div style={{ height: '8px', width: '100%', backgroundColor: '#F1F5F9', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#E84A4A', borderRadius: '4px' }}></div>
          </div>
        </div>
      </section>

      {/* 3. MONTH INDICATOR */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '16px', backgroundColor: '#FFF', padding: '12px 32px', borderRadius: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{displayYear}.{displayMonth}</span>
        </div>
      </div>

      {/* 4. INDIVIDUAL HABIT CARDS */}
      {habits?.map((habit, index) => {
        const calendar = getHabitCalendar(habit.habit_id);
        const streak = calculateStreak(habit.habit_id);
        const iconBg = ['#FFECEC', '#E0F2FE', '#F0FDF4'][index] || '#F1F5F9';
        const iconColor = ['#E84A4A', '#0284C7', '#16A34A'][index] || '#64748B';

        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '32px', backgroundColor: '#FFF', borderRadius: '28px', boxShadow: '0 4px 20px rgba(0,0,0,0.02)', border: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: iconBg, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                {['🎯', '📖', '🎧'][index] || '✨'}
              </div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{habit.goal_text}</h3>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '12px', textAlign: 'center', marginBottom: '32px' }}>
              {['SUN','MON','TUE','WED','THU','FRI','SAT'].map(d => <div key={d} style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 700, marginBottom: '4px' }}>{d}</div>)}
              {calendar.map(d => (
                <div key={d.day} style={{ 
                  height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '1rem', fontWeight: 700, borderRadius: '14px',
                  backgroundColor: d.done ? '#FFECEC' : '#F8F9FC', 
                  color: d.done ? '#E84A4A' : '#CBD5E1',
                  transition: 'all 0.2s ease'
                }}>
                  {d.day}
                  {d.done && <div style={{ position: 'absolute', width: '8px', height: '8px', backgroundColor: '#E84A4A', borderRadius: '50%', bottom: '6px' }}></div>}
                </div>
              ))}
            </div>

            {/* STREAK DISPLAY */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ backgroundColor: '#F8F9FC', padding: '10px 24px', borderRadius: '16px', display: 'inline-flex', alignItems: 'center', gap: '10px', border: '1px solid #F1F5F9' }}>
                <span style={{ fontSize: '1rem' }}>🔥</span>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1E293B' }}>{streak}日連続達成中</span>
              </div>
            </div>
          </div>
        );
      })}

      {/* SHARE BUTTON */}
      <footer style={{ marginTop: '64px', paddingBottom: '40px' }}>
        <a href={`https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '72px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '24px', fontWeight: 800, fontSize: '1.1rem', boxShadow: '0 12px 24px rgba(6,199,85,0.15)' }}>
          お友達にアプリを紹介する ➔
        </a>
      </footer>
    </main>
  );
}
