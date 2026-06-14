import React from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function Home() {
  const { data: goal } = await supabase.from('goal_settings').select('*').single();
  return (
    <main style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>🏆 習慣化ダッシュボード</h1>
      <p>この画面が表示されていれば、デプロイ成功です！</p>
      <div style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '1rem', marginTop: '1rem' }}>
        <p>現在の連続：{goal?.current_streak || 0}日</p>
      </div>
    </main>
  );
}
