'use client';
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SetupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [goalSlogan, setGoalSlogan] = useState('TOEFL 90点取得！3か月後の会議で勝つ');
  const [targetDays, setTargetDays] = useState('90');
  const [habit1, setHabit1] = useState({ title: '3分シャドーイング', mins: '15' });
  const [habit2, setHabit2] = useState({ title: '単語・言い回し', mins: '15' });
  const [habit3, setHabit3] = useState({ title: '少しでも英文読解', mins: '15' });
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. 画像アップロード
      if (file) {
        const fileName = `${Date.now()}_goal.png`;
        await supabase.storage.from('goal-images').upload(fileName, file);
      }

      // 2. 目標設定を DB (goal_settings) に保存
      const { data: user } = await supabase.from('users').select('user_id').limit(1).single();
      if (user) {
        await supabase.from('goal_settings').upsert({
          user_id: user.user_id,
          goal_slogan: goalSlogan,
          target_days: parseInt(targetDays)
        });
      }

      // 3. 習慣名を DB (habits) に保存
      const habitState = [habit1, habit2, habit3];
      const { data: existingHabits } = await supabase.from('habits').select('habit_id').limit(3);
      if (existingHabits) {
        for (let i = 0; i < existingHabits.length; i++) {
          await supabase.from('habits').update({ 
            goal_text: habitState[i].title 
          }).eq('habit_id', existingHabits[i].habit_id);
        }
      }

      alert("設定を保存しました！最新の状態を読み込みます。");
      
      // 重要：キャッシュを回避するためにタイムスタンプを付与してリダイレクト
      window.location.assign("/?refresh=" + Date.now());
      
    } catch (error) {
      console.error(error);
      alert("保存エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#F8F9FC', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#FFF', padding: '40px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.04)', border: '1px solid #F1F5F9' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '32px', textAlign: 'center', color: '#1E293B' }}>⚙️ MOTIVATOR 設定</h2>
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '24px', border: '2px dashed #E2E8F0', borderRadius: '24px', padding: '30px', textAlign: 'center', backgroundColor: '#F8F9FC' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 700, color: '#64748B' }}>目標写真をアップロード</p>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>MAIN GOAL</label>
          <input style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '20px', fontSize: '1rem' }} value={goalSlogan} onChange={(e) => setGoalSlogan(e.target.value)} required />
          
          <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>TARGET DAYS</label>
          <input type="number" style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', marginBottom: '32px', fontSize: '1rem' }} value={targetDays} onChange={(e) => setTargetDays(e.target.value)} required />
          
          <p style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '16px', color: '#1E293B' }}>HABIT SETTINGS (Name & Goal Mins)</p>
          {[habit1, habit2, habit3].map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} value={h.title} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, title: e.target.value})} required />
              <input type="number" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }} value={h.mins} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, mins: e.target.value})} required />
            </div>
          ))}
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '20px', background: '#1E293B', color: '#FFF', borderRadius: '20px', fontWeight: 800, fontSize: '1.05rem', cursor: 'pointer', marginTop: '24px', border: 'none' }}>
            {loading ? "SAVING..." : "保存してダッシュボードへ"}
          </button>
        </form>
      </div>
    </main>
  );
}
