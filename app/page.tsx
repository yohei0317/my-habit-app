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

  // 1. 習慣と目標写真を取得 (goal_settingsから写真を取得)
  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  const { data: goal } = await supabase.from('goal_settings').select('*').single();

  // 2. カレンダー用のログ取得 (今月分)
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('logged_date, status')
    .gte('logged_date', startDate)
    .eq('status', 'done');

  const doneDates = new Set(logs?.map(l => l.logged_date));

  // カレンダーの日付生成 (簡易版)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = new Date(year, month, i + 1).toISOString().split('T')[0];
    return { day: i + 1, done: doneDates.has(dateStr) };
  });

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc' }}>
      {/* ヘッダー */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <div style={{ fontSize: '0.9rem' }}>👤 ユーザー名</div>
      </header>

      {/* 目標写真エリア */}
      <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', marginBottom: '20px', backgroundColor: '#fff' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#888' }}>目標写真</p>
        <img 
          src={goal?.goal_photo_url || "https://via.placeholder.com/600x200?text=Goal+Photo"} 
          style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '4px' }}
          alt="目標" 
        />
      </section>

      {/* カレンダーエリア */}
      <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
          <span>〈  {year}年{month + 1}月  〉</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', fontSize: '0.8rem' }}>
          {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ color: '#888' }}>{d}</div>)}
          {/* 空白セル調整は簡易化のため省略 */}
          {calendarDays.map(d => (
            <div key={d.day} style={{ height: '35px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {d.day}
              {d.done && <span style={{ position: 'absolute', color: 'orange', fontSize: '1.5rem', top: '-2px' }}>○</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 連続記録 & バッジ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '2rem', marginRight: '10px' }}>🔥</span>
          <div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>現在の連続記録</p>
            <strong style={{ fontSize: '1.8rem' }}>{goal?.current_streak || 0}日連続</strong>
          </div>
        </section>
        <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', textAlign: 'center' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#888' }}>バッジ</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '1.5rem' }}>
            <span title="21日達成" style={{ opacity: (goal?.current_streak >= 21) ? 1 : 0.2 }}>⭐</span>
            <span title="皆勤賞" style={{ opacity: 0.2 }}>🏆</span>
            <span title="初達成" style={{ opacity: (goal?.current_streak >= 1) ? 1 : 0.2 }}>🛡️</span>
          </div>
        </section>
      </div>

      {/* 習慣一覧 */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px' }}>
        {habits?.map((h, i) => (
          <div key={i} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#fff', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '5px' }}>{['🏃','📖','💧'][i] || '✨'}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{h.goal_text}</div>
            <div style={{ fontSize: '0.7rem', color: '#ff8c00' }}>🔥 記録あり</div>
          </div>
        ))}
      </section>
    </main>
  );
}
