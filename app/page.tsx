import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// キャッシュを無効化し、常に最新のDB値を読み込む
export const revalidate = 0;
export const dynamic = 'force-dynamic';

interface HomeProps {
  searchParams: { month?: string; year?: string };
}

export default async function Home({ searchParams }: HomeProps) {
  // 日本時間の現在年月を取得
  const jstOffset = 9 * 60 * 60 * 1000;
  const jstNow = new Date(new Date().getTime() + jstOffset);
  const currentYear = jstNow.getUTCFullYear();
  const currentMonth = jstNow.getUTCMonth() + 1;

  const displayYear = searchParams.year ? parseInt(searchParams.year) : currentYear;
  const displayMonth = searchParams.month ? parseInt(searchParams.month) : currentMonth;

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

  // 月移動用
  const prevDate = new Date(Date.UTC(displayYear, displayMonth - 2, 1));
  const nextDate = new Date(Date.UTC(displayYear, displayMonth, 1));

  const getHabitData = async (habitId: string) => {
    // 検索範囲（その月の1日から31日まで）
    const startDate = `${displayYear}-${String(displayMonth).padStart(2, '0')}-01`;
    const endDate = `${displayYear}-${String(displayMonth).padStart(2, '0')}-31`;
    
    // daily_logs から「status が true（やった）」のデータを取得
    const { data: logs } = await supabase
      .from('daily_logs')
      .select('logged_date')
      .eq('habit_id', habitId)
      .eq('status', true) // bool型に対応
      .gte('logged_date', startDate)
      .lte('logged_date', endDate);

    const doneDates = new Set(logs?.map(l => l.logged_date));
    const daysInMonth = new Date(displayYear, displayMonth, 0).getDate();
    
    const calendar = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const dateStr = `${displayYear}-${String(displayMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, done: doneDates.has(dateStr) };
    });

    return { calendar, count: logs?.length || 0 };
  };

  return (
    <main style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ margin: 0 }}>🏆 習慣化管理</h2>
        <a href="/setup" style={{ fontSize: '0.8rem', color: '#333', textDecoration: 'none', padding: '5px 12px', border: '1px solid #ddd', borderRadius: '20px', backgroundColor: '#fff' }}>
          👤 設定・目標変更
        </a>
      </header>

      {/* 月切り替えナビ */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px', marginBottom: '20px', backgroundColor: '#fff', padding: '10px', borderRadius: '12px', border: '1px solid #eee' }}>
        <a href={`/?year=${prevDate.getUTCFullYear()}&month=${prevDate.getUTCMonth() + 1}`} style={{ textDecoration: 'none', color: '#ff8c00' }}>◀</a>
        <h2 style={{ margin: 0, fontSize: '1.2rem' }}>{displayYear}年 {displayMonth}月</h2>
        <a href={`/?year=${nextDate.getUTCFullYear()}&month=${nextDate.getUTCMonth() + 1}`} style={{ textDecoration: 'none', color: '#ff8c00' }}>▶</a>
      </div>

      {/* 目標写真 */}
      <section style={{ border: '1px solid #ddd', borderRadius: '12px', padding: '10px', textAlign: 'center', marginBottom: '30px', backgroundColor: '#fff', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
        {goalImageUrl ? (
          <img 
            src={goalImageUrl} 
            style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }}
            alt="目標" 
          />
        ) : (
          <div style={{ padding: '40px', background: '#eee', color: '#999' }}>右上の設定から写真をアップロードしてください</div>
        )}
      </section>

      {/* 習慣別カレンダー */}
      {await Promise.all((habits || []).map(async (habit) => {
        const { calendar, count } = await getHabitData(habit.habit_id);
        return (
          <div key={habit.habit_id} style={{ marginBottom: '40px', padding: '20px', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #eee', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
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
              この月の達成：<strong style={{ fontSize: '1.2rem', color: '#ff4500' }}>{count}日</strong>
            </div>
          </div>
        );
      }))}
    </main>
  );
}
