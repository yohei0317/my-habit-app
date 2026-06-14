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

  const handleSave = async () => {
    setLoading(true);
    try {
      if (file) {
        const fileName = `${Date.now()}_goal.png`;
        await supabase.storage.from('goal-images').upload(fileName, file);
      }
      alert("設定を保存しました！");
      window.location.href = "/";
    } catch (error) {
      alert("保存エラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '40px 20px', backgroundColor: '#F8F9FC', minHeight: '100vh' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#FFF', padding: '32px', borderRadius: '28px' }}>
        <h2 style={{ textAlign: 'center' }}>⚙️ MOTIVATOR 設定</h2>
        <div style={{ marginBottom: '24px', border: '2px dashed #EEE', padding: '20px', textAlign: 'center' }}>
          <p>目標写真</p>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>
        <label>メイン目標</label>
        <input style={{ width: '100%', padding: '10px', marginBottom: '20px' }} value={goalSlogan} onChange={(e) => setGoalSlogan(e.target.value)} />
        <label>目標日数</label>
        <input type="number" style={{ width: '100%', padding: '10px', marginBottom: '20px' }} value={targetDays} onChange={(e) => setTargetDays(e.target.value)} />
        <p>習慣設定</p>
        {[habit1, habit2, habit3].map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <input style={{ flex: 2, padding: '10px' }} value={h.title} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, title: e.target.value})} />
            <input type="number" style={{ flex: 1, padding: '10px' }} value={h.mins} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, mins: e.target.value})} />
          </div>
        ))}
        <button onClick={handleSave} disabled={loading} style={{ width: '100%', padding: '20px', background: '#000', color: '#FFF', borderRadius: '12px', marginTop: '20px' }}>
          {loading ? "保存中..." : "保存してダッシュボードへ"}
        </button>
      </div>
    </main>
  );
}
