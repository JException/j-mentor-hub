"use client";
import React, { useState, useEffect, useRef, use } from 'react'; // Added 'use'
import { 
  UploadCloud, ArrowLeft, Send, 
  User, Save, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// --- TYPES ---
interface Comment {
  id: string;
  user: string;
  text: string;
  time: string;
}

interface Scores {
  presentation: number;
  content: number;
  answers: number;
  manuscript: number;
}

// NOTE: params is now a Promise in Next.js 15
export default function PanelCockpit({ params }: { params: Promise<{ id: string }> }) {
  // 1. UNWRAP PARAMS
  const { id } = use(params);
  
  const router = useRouter();
  const [group, setGroup] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasFile, setHasFile] = useState(false); 
  
  // Grading State
  const [scores, setScores] = useState<Scores>({
    presentation: 0, content: 0, answers: 0, manuscript: 0
  });

  // Comments State
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 2. FETCH GROUP DATA ON LOAD
  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const res = await fetch(`/api/groups?view=panel`); 
        const data = await res.json();
        const currentGroup = data.find((g: any) => g._id === id); // Use 'id' here
        
        if (currentGroup) {
            setGroup(currentGroup);
            // Load previous evaluation if it exists for "Sir Pura"
            const myEval = currentGroup.defense?.evaluations?.find((e: any) => e.evaluator === "Sir Pura");
            if(myEval) {
                setScores(myEval.scores);
                setComments(myEval.comments);
            }
        }
      } catch (error) {
        console.error("Failed to load group");
      }
    };
    fetchGroup();
  }, [id]); // Dependency is now 'id'

  // Calculate Weighted Average
  const finalScore = (
    (scores.presentation * 0.20) + 
    (scores.content * 0.40) + 
    (scores.answers * 0.30) + 
    (scores.manuscript * 0.10)
  ).toFixed(2);

  const handleScoreChange = (criteria: keyof Scores, value: string) => {
    setScores(prev => ({ ...prev, [criteria]: Number(value) }));
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment: Comment = {
      id: Date.now().toString(),
      user: "Sir Pura",
      text: newComment,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setComments([...comments, comment]);
    setNewComment("");
  };

  // 3. SAVE HANDLER
  const handleSave = async () => {
      setIsSaving(true);
      try {
        // Use 'id' in the fetch URL
        await fetch(`/api/groups/${id}/evaluate`, {
            method: 'POST',
            body: JSON.stringify({
                evaluator: "Sir Pura",
                scores,
                comments
            })
        });
        alert("Evaluation Saved!");
      } catch (error) {
        alert("Failed to save.");
      } finally {
        setIsSaving(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setHasFile(true);
  };

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  if (!group) return <div className="p-10 text-center">Loading Panel Board...</div>;

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-800 overflow-hidden font-sans">
      
      {/* HEADER */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/panel-board" className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="font-bold text-lg text-slate-800 leading-none">{group.groupName}</h1>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[300px]">{group.thesisTitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
             <div className="text-right px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase mr-2">Grade</span>
                <span className={`text-lg font-black ${Number(finalScore) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                  {finalScore}
                </span>
             </div>
             <button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50"
             >
               {isSaving ? 'Saving...' : <><Save size={14} /> Save Draft</>}
             </button>
        </div>
      </div>

      {/* WORKSPACE */}
      <div className="flex flex-1 overflow-hidden p-3 gap-3">
        
        {/* LEFT: MANUSCRIPT */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col relative overflow-hidden">
          {!hasFile ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50 m-2 rounded-lg border-2 border-dashed border-slate-200">
               <UploadCloud size={32} className="text-slate-300 mb-2" />
               <h3 className="text-sm font-bold text-slate-600">No Manuscript</h3>
               <label className="mt-4 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold cursor-pointer hover:bg-slate-50 transition-all">
                 <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                 Upload PDF
               </label>
            </div>
          ) : (
            <iframe src="/dummy.pdf" className="w-full h-full" title="Manuscript" />
          )}
        </div>

        {/* RIGHT: SCORING & COMMENTS (STACKED) */}
        <div className="w-[380px] flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
           
           {/* SCROLLABLE CONTENT */}
           <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              
              {/* SECTION 1: RUBRIC */}
              <div className="mb-6">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <CheckCircle2 size={12} /> Rubric Evaluation
                  </h3>
                  <div className="space-y-3">
                    <ScoreSlider label="Oral Presentation" weight="20%" value={scores.presentation} onChange={(v) => handleScoreChange('presentation', v)} />
                    <ScoreSlider label="Technical Content" weight="40%" value={scores.content} onChange={(v) => handleScoreChange('content', v)} />
                    <ScoreSlider label="Q&A Response" weight="30%" value={scores.answers} onChange={(v) => handleScoreChange('answers', v)} />
                    <ScoreSlider label="Manuscript Quality" weight="10%" value={scores.manuscript} onChange={(v) => handleScoreChange('manuscript', v)} />
                  </div>
              </div>

              <hr className="border-slate-100 mb-6" />

              {/* SECTION 2: LIVE COMMENTS */}
              <div>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <User size={12} /> Live Comments
                  </h3>
                  <div className="space-y-3 pl-1">
                    {comments.length === 0 && (
                        <p className="text-xs text-slate-300 italic">No comments yet.</p>
                    )}
                    {comments.map((c) => (
                      <div key={c.id} className="relative pl-4 border-l-2 border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-slate-600">{c.user}</span>
                              <span className="text-[9px] text-slate-300">{c.time}</span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg rounded-tl-none">
                              {c.text}
                          </p>
                      </div>
                    ))}
                    <div ref={commentsEndRef} />
                  </div>
              </div>

           </div>

           {/* FOOTER: COMMENT INPUT */}
           <div className="p-3 border-t border-slate-100 bg-slate-50">
                <div className="flex gap-2">
                  <input 
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    placeholder="Type feedback..."
                    className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                  <button 
                    onClick={handleAddComment}
                    className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    <Send size={14} />
                  </button>
                </div>
           </div>

        </div>
      </div>
    </div>
  );
}

// --- COMPACT SLIDER ---
function ScoreSlider({ label, weight, value, onChange }: { label: string, weight: string, value: number, onChange: (v: string) => void }) {
  return (
    <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
            <span className="font-bold text-slate-600 text-xs">{label}</span>
            <span className="text-[9px] font-bold text-slate-400 bg-slate-200/50 px-1.5 py-0.5 rounded">{weight}</span>
        </div>
        <span className="text-sm font-black text-blue-600">{value}</span>
      </div>
      <input 
        type="range" min="0" max="100" value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}