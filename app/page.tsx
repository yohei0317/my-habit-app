import React from 'react';
import { createClient } from '@supabase/supabase-js';

// 直接環境変数からクライアントを作成
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default async function Home() {
  const { data: goal } = await supabase.from('goal_settings').select('*').single();

  return (
    <main className="p-4 max-w-md mx-auto bg-white min-h-screen">
      <h1 className="text-xl font-bold mb-4">🏆 習慣化ダッシュボード</h1>
      <div className="mb-6 border rounded-xl overflow-hidden shadow-sm">
        <img src={goal?.goal_photo_url || "https://via.placeholder.com/400x250"} alt="目標" className="w-full h-48 object-cover" />
        <div className="p-3 bg-gray-50 text-center font-medium">✨ 目標：英語で会議！</div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6 text-center">
        <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
          <p className="text-sm text-orange-600">現在の連続</p>
          <p className="text-2xl font-bold">{goal?.current_streak || 0}日</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
          <p className="text-sm text-blue-600">自己ベスト</p>
          <p className="text-2xl font-bold">{goal?.best_streak || 0}日</p>
        </div>
      </div>
    </main>
  );
}
