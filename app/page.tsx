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

  // 1. 習慣と最新の目標写真を取得
  const { data: habits } = await supabase.from('habits').select('*').eq('is_active', true).limit(3);
  
  // Storageから最新の画像ファイル名を取得
  const { data: files } = await supabase.storage.from('goal-images').list('', {
    limit: 1,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  const latestImageName = files?.[0]?.name;
  const goalImageUrl = latestImageName 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/goal-images/${latestImageName}`
    : null;

  // 2. カレンダー用のログ取得
  const startDate = new Date(year, month, 1).toISOString().split('T')[0];
  const { data: logs } = await supabase
    .from('daily_logs')
    .select('logged_date, status')
    .gte('logged_date', startDate)
    .eq('status', 'done');

  const doneDates = new Set(logs?.map(l => l.logged_date));
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = new Date(year, month, i + 1).toISOString().split('T')[0];
    return { day: i + 1, done: doneDates.has(dateStr) };
  });

  // 連続日数の集計（簡易版：直近のログ数を表示）
  const totalDoneCount = logs?.length || 0;

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <div style={{ fontSize: '0.9rem' }}>👤 ユーザー</div>
      </header>

      {/* 目標写真エリア：最新のアップロード画像を表示 */}
      <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', textAlign: 'center', marginBottom: '20px', backgroundColor: '#fff' }}>
        <p style={{ margin: '0 0 10px 0', fontSize: '0.8rem', color: '#888' }}>現在の目標写真</p>
        {goalImageUrl ? (
          <img 
            src={goalImageUrl} 
            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '4px' }}
            alt="目標" 
          />
        ) : (
          <div style={{ padding: '40px', background: '#eee', color: '#999' }}>設定画面から写真をアップロードしてください</div>
        )}
      </section>

      {/* カレンダーエリア */}
      <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', marginBottom: '20px', backgroundColor: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 'bold' }}>
          〈  {year}年{month + 1}月  〉
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px', textAlign: 'center', fontSize: '0.8rem' }}>
          {['日','月','火','水','木','金','土'].map(d => <div key={d} style={{ color: '#888' }}>{d}</div>)}
          {calendarDays.map(d => (
            <div key={d.day} style={{ height: '35px', border: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              {d.day}
              {d.done && <span style={{ position: 'absolute', color: 'orange', fontSize: '1.5rem', top: '-2px' }}>○</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 連続記録 & 習慣カード */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
        <section style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '15px', backgroundColor: '#fff', textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#888' }}>今月の合計達成</p>
          <strong style={{ fontSize: '1.8rem' }}>{totalDoneCount}回</strong>
        </section>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
          {habits?.map((h, i) => (
            <div key={i} style={{ border: '1px solid #ddd', borderRadius: '8px', padding: '10px', backgroundColor: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{h.goal_text}</div>
              <div style={{ fontSize: '0.7rem', color: '#ff8c00', marginTop: '5px' }}>🔥 習慣継続中</div>
            </div>
          ))}
        </div>
      </div>
      
      <div style={{ marginTop: '20px', textAlign: 'center' }}>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#0070f3', textDecoration: 'none' }}>⚙️ 写真や習慣を変更する</a>
      </div>
    </main>
  );
}
