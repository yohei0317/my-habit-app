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

  // 1. 基本データの取得
  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  const { data: files } = await supabase.storage.from('goal-images').list('', { limit: 1, sortBy: { column: 'created_at', order: 'desc' } });
  const goalImageUrl = files?.[0]?.name ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${files[0].name}` : null;

  // 2. 全期間の累計努力時間を計算 (duration列の総和)
  const { data: allDoneLogs } = await supabase.from('daily_logs').select('duration, logged_date, habit_id').eq('status', true);
  const totalMinutes = allDoneLogs?.reduce((sum, log) => sum + (log.duration || 0), 0) || 0;
  const totalHours = Math.floor(totalMinutes / 60);
  const remainingMins = totalMinutes % 60;

  // 3. バロメーター計算 (例: 目標90日 × 3つの習慣 × 各15分 = 100%)
  const targetDays = 90;
  const estimatedMinsPerDay = 45; // 3習慣合計で45分と仮定
  const goalTotalMins = targetDays * estimatedMinsPerDay;
  const progressPercent = Math.min(Math.round((totalMinutes / goalTotalMins) * 100), 100);

  // 4. カレンダー用データ（表示月の「○」判定）
  const startStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-01`;
  const endStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-31`;
  const monthLogs = (allDoneLogs || []).filter(l => l.logged_date >= startStr && l.logged_date <= endStr);
  const doneDates = new Set(monthLogs.map(l => l.logged_date));
  
  const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
  const calendar = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return { day: d, done: doneDates.has(dateStr) };
  });

  // 5. 連続日数の計算ロジック
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

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '30px 20px', fontFamily: 'sans-serif', backgroundColor: '#F8F9FA', minHeight: '100vh', color: '#333' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#FF8C00' }}>🔥 モチベーター</h1>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#666', textDecoration: 'none', padding: '8px 16px', borderRadius: '50px', border: '1px solid #E0E0E0', backgroundColor: '#FFF' }}>⚙️ 設定・目標変更</a>
      </header>

      {/* 目標写真 & スローガン */}
      <section style={{ marginBottom: '30px', textAlign: 'center' }}>
        <div style={{ borderRadius: '20px', overflow: 'hidden', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', backgroundColor: '#FFF', padding: '10px' }}>
          {goalImageUrl ? <img src={goalImageUrl} style={{ width: '100%', borderRadius: '12px' }} alt="Goal" /> : <div style={{ padding: '40px', color: '#AAA' }}>目標写真を設定してください</div>}
        </div>
        <h2 style={{ marginTop: '20px', fontSize: '1.2rem', fontWeight: 700 }}>「TOEFL 90点取得！3か月後の会議で勝つ」</h2>
      </section>

      {/* ⏳ 総努力時間バロメーター (最上部) */}
      <section style={{ marginBottom: '40px', padding: '25px', backgroundColor: '#FFF', borderRadius: '24px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '10px' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}>📈 累計の総努力時間</span>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#FF8C00' }}>{totalHours}h {remainingMins}m</span>
        </div>
        <div style={{ height: '12px', width: '100%', backgroundColor: '#EEE', borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progressPercent}%`, backgroundColor: '#FF8C00', transition: 'width 1s ease-in-out' }}></div>
        </div>
        <div style={{ textAlign: 'right', marginTop: '8px', fontSize: '0.8rem', color: '#999' }}>目標達成まで {progressPercent}%</div>
      </section>

      {/* 📅 統合習慣カレンダー */}
      <section style={{ marginBottom: '40px', padding: '25px', backgroundColor: '#FFF', borderRadius: '24px', border: '1px solid #FFE0B2' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '1rem', textAlign: 'center' }}>{displayYear}年 {displayMonth}月 の積み上げ</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center' }}>
          {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ fontSize: '0.7rem', color: '#BBB', fontWeight: 800 }}>{d}</div>)}
          {calendar.map(d => (
            <div key={d.day} style={{ 
              height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', fontSize: '0.9rem', fontWeight: 600, borderRadius: '10px',
              backgroundColor: d.done ? '#FFF4E5' : '#FAFAFA', color: d.done ? '#FF8C00' : '#444'
            }}>
              {d.day}
              {d.done && <div style={{ position: 'absolute', width: '34px', height: '34px', border: '2px solid #FF8C00', borderRadius: '50%', opacity: 0.4 }}></div>}
            </div>
          ))}
        </div>
      </section>

      {/* 現在の各習慣ステータス */}
      <section>
        {habits?.map((habit) => (
          <div key={habit.habit_id} style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', borderBottom: '1px solid #EEE' }}>
            <span style={{ fontWeight: 600 }}>✨ {habit.goal_text}</span>
            <span style={{ color: '#FF8C00', fontWeight: 700 }}>🔥 {calculateStreak(habit.habit_id)}日連続</span>
          </div>
        ))}
      </section>

      {/* お友達紹介ボタン */}
      <div style={{ marginTop: '50px' }}>
        <a href="https://line.me/R/nv/recommendOA/@YOUR_BOT_BASIC_ID" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '18px', background: '#06C755', color: '#FFF', textDecoration: 'none', borderRadius: '18px', fontWeight: 700 }}>
          お友達にアプリを紹介する ➔
        </a>
      </div>
    </main>
  );
}
