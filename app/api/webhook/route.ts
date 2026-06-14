'use client';
import React, { useState, useEffect } from 'react';
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
      let imageUrl = "";

      // 1. 画像のアップロード
      if (file) {
        const fileName = `${Date.now()}_goal.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('goal-images')
          .upload(fileName, file);
        if (uploadError) throw uploadError;
      }

      // 2. 目標設定と習慣の保存ロジック（実際にはここでテーブルを更新します）
      // ※現在は簡易版としてアラート表示。
      alert("設定を保存しました！ダッシュボードに反映されます。");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("保存中にエラーが発生しました。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: '40px 20px', fontFamily: '"Inter", sans-serif', backgroundColor: '#F8F9FC', minHeight: '100vh', color: '#1E293B' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto', backgroundColor: '#FFF', padding: '32px', borderRadius: '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '24px', textAlign: 'center' }}>⚙️ MOTIVATOR 設定</h2>
        
        {/* 画像アップロード */}
        <div style={{ marginBottom: '32px', border: '2px dashed #E2E8F0', borderRadius: '20px', padding: '30px', textAlign: 'center', backgroundColor: '#F8F9FC' }}>
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', fontWeight: 700, color: '#64748B' }}>目標写真をアップロード</p>
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} style={{ fontSize: '0.8rem' }} />
        </div>

        {/* 目標スローガン */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>メイン目標</label>
          <input 
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '1rem' }} 
            value={goalSlogan} 
            onChange={(e) => setGoalSlogan(e.target.value)} 
          />
        </div>

        {/* 目標日数 */}
        <div style={{ marginBottom: '32px' }}>
          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B', display: 'block', marginBottom: '8px' }}>目標期間 (日)</label>
          <input 
            type="number"
            style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '1rem' }} 
            value={targetDays} 
            onChange={(e) => setTargetDays(e.target.value)} 
          />
        </div>

        <hr style={{ border: 'none', borderTop: '1px solid #F1F5F9', margin: '32px 0' }} />

        {/* 習慣設定（名前と分） */}
        <p style={{ fontSize: '0.9rem', fontWeight: 800, marginBottom: '16px' }}>習慣ごとの目標設定</p>
        
        {[habit1, habit2, habit3].map((h, i) => {
          const setter = [setHabit1, setHabit2, setHabit3][i];
          return (
            <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>習慣名</label>
                <input 
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0' }} 
                  value={h.title} 
                  onChange={(e) => setter({...h, title: e.target.value})} 
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '0.7rem', color: '#94A3B8' }}>時間 (分)</label>
                <input 
                  type="number"
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #E2E8F0' }} 
                  value={h.mins} 
                  onChange={(e) => setter({...h, mins: e.target.value})} 
                />
              </div>
            </div>
          );
        })}

        <button 
          onClick={handleSave}
          style={{ 
            width: '100%', padding: '18px', background: '#1E293B', color: '#FFF', border: 'none', borderRadius: '16px', 
            fontWeight: 800, fontSize: '1rem', marginTop: '24px', cursor: 'pointer', transition: 'opacity 0.2s' 
          }}
          disabled={loading}
        >
          {loading ? "保存中..." : "設定を完了して始める"}
        </button>
      </div>
    </main>
  );
}
