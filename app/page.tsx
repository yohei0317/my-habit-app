import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function Home() {
  const { data: goal } = await supabaseClient.from('goal_settings').select('*').single();

  return (
    <main style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>🏆 習慣化ダッシュボード</h1>
      <div style={{ border: '1px solid #ddd', borderRadius: '10px', overflow: 'hidden' }}>
        <img src={goal?.goal_photo_url || "https://via.placeholder.com/400x250"} alt="目標" style={{ width: '100%', height: '200px', objectCover: 'cover' }} />
        <p style={{ textAlign: 'center', fontWeight: 'bold' }}>✨ 目標：英語で会議！</p>
      </div>
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <div style={{ flex: 1, background: '#fff5f0', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
          <p>現在の連続</p>
          <h2>{goal?.current_streak || 0}日</h2>
        </div>
        <div style={{ flex: 1, background: '#f0f7ff', padding: '10px', borderRadius: '10px', textAlign: 'center' }}>
          <p>自己ベスト</p>
          <h2>{goal?.best_streak || 0}日</h2>
        </div>
      </div>
    </main>
  );
}
