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
    if (loading) return;
    
    setLoading(true);
    try {
      // 1. 画像のアップロード
      if (file) {
        const fileName = `${Date.now()}_goal.png`;
        const { error: uploadError } = await supabase.storage
          .from('goal-images')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
      }

      // 2. 完了通知
      alert("設定を保存しました。ダッシュボードへ移動します。");
      
      // 3. 確実にダッシュボードへ戻る
      window.location.assign("/");
      
    } catch (error: any) {
      console.error(error);
      alert("エラーが発生しました: " + (error.message || "不明なエラー"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ 
      display: 'flex', justifyContent: 'center', alignItems: 'center', 
      minHeight: '100vh', width: '100%', backgroundColor: '#F8F9FC', padding: '20px'
    }}>
      <div style={{ 
        width: '100%', maxWidth: '500px', backgroundColor: '#FFF', 
        padding: '40px', borderRadius: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.04)',
        border: '1px solid #F1F5F9'
      }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '32px', textAlign: 'center', color: '#1E293B' }}>
          ⚙️ MOTIVATOR 設定
        </h2>
        
        <form onSubmit={handleSave}>
          <div style={{ marginBottom: '24px', border: '2px dashed #E2E8F0', borderRadius: '24px', padding: '30px', textAlign: 'center', backgroundColor: '#F8F9FC' }}>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 700, color: '#64748B' }}>目標写真をアップロード</p>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem' }} />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>MAIN GOAL</label>
            <input style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '1rem' }} value={goalSlogan} onChange={(e) => setGoalSlogan(e.target.value)} required />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94A3B8', display: 'block', marginBottom: '8px' }}>TARGET DAYS</label>
            <input type="number" style={{ width: '100%', padding: '14px', borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '1rem' }} value={targetDays} onChange={(e) => setTargetDays(e.target.value)} required />
          </div>

          <p style={{ fontSize: '0.8rem', fontWeight: 900, marginBottom: '16px', color: '#1E293B' }}>HABIT SETTINGS</p>
          {[habit1, habit2, habit3].map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input style={{ flex: 2, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0' }} value={h.title} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, title: e.target.value})} required />
              <input type="number" style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #E2E8F0', textAlign: 'center' }} value={h.mins} onChange={(e) => [setHabit1, setHabit2, setHabit3][i]({...h, mins: e.target.value})} required />
            </div>
          ))}

          <button 
            type="submit"
            disabled={loading} 
            style={{ 
              width: '100%', padding: '20px', background: '#1E293B', color: '#FFF', 
              borderRadius: '20px', marginTop: '24px', border: 'none',
              fontWeight: 800, fontSize: '1.05rem', cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px rgba(30,41,59,0.1)', opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? "保存中..." : "保存してダッシュボードへ"}
          </button>
        </form>
      </div>
    </main>
  );
}
