"use client";

import React, { useState, useEffect, useRef, use } from 'react';
import { 
  ArrowLeft, Save, CheckCircle2, 
  FileText, Users, Presentation, MessageSquare,
  UploadCloud, FolderOpen, Send, HelpCircle, 
  Lightbulb, AlertTriangle, Trash2, Edit2, X,
  Clock, Download, ChevronRight, Loader2, AlertOctagon
} from 'lucide-react';
import Link from 'next/link';
import { getGroupsFromDB, saveGroupEvaluation } from "@/app/actions";

// --- TYPES ---
interface FileDoc {
  fileId: string;
  name: string;
  type: string;
  uploadDate: string;
  url: string; 
}

interface Group {
  _id: string;
  groupName: string;
  thesisTitle: string;
  files?: FileDoc[]; 
  members?: string[];
}

// --- RUBRIC CONFIGURATION ---
// 1. PAPER RUBRIC (Total Weight: 8)
const PAPER_RUBRIC = [
  {
    title: "Chapter 1: Introduction",
    items: [
      { id: 'background', label: "Background of the Study", weight: 1 },
      { id: 'significance', label: "Significance of the Study", weight: 1 },
      { id: 'objectives', label: "Objectives", weight: 2 },
      { id: 'scope', label: "Scope and Limitations", weight: 1 },
      { id: 'framework', label: "Conceptual Framework", weight: 1 },
      { id: 'algorithm', label: "Discussion of Algorithm", weight: 2 },
    ]
  },
  {
    title: "Chapter 2: RRL",
    items: [
      { id: 'context', label: "Research Context Relevance", weight: 1 },
      { id: 'references', label: "Quality/Quantity of References", weight: 1 },
    ]
  },
  {
    title: "Chapter 3: Methodology",
    items: [
      { id: 'design', label: "Project Design/Architecture", weight: 1 },
      { id: 'development', label: "Project Development", weight: 1 },
      { id: 'testing', label: "Testing Procedures", weight: 1 },
    ]
  }
];

// 2. PRESENTATION RUBRIC (Total Weight: 7)
const PRESENTATION_RUBRIC = [
  { id: 'consistency', label: "Consistency", weight: 3 },
  { id: 'materials', label: "Materials", weight: 1 },
  { id: 'manner', label: "Manner of Presentation", weight: 1 },
  { id: 'overview', label: "Project Overview", weight: 2 },
];

// 3. INDIVIDUAL RUBRIC (Total Weight: 20)
const INDIVIDUAL_RUBRIC = [
  { id: 'mastery', label: "Subject Mastery", weight: 8 },
  { id: 'qa', label: "Ability to Answer Questions", weight: 6 },
  { id: 'delivery', label: "Delivery", weight: 2 },
  { id: 'verbal', label: "Verbal/Non-Verbal Ability", weight: 2 },
  { id: 'grooming', label: "Grooming", weight: 2 },
];

// --- CONSTANTS FOR CALCULATIONS ---
const MAX_RATING = 5; // Grading is 0 to 5

// Calculate max possible weighted scores for normalization
const PAPER_MAX_WEIGHTED_SCORE = PAPER_RUBRIC.flatMap(r => r.items).reduce((acc, item) => acc + (item.weight * MAX_RATING), 0); 
const PRES_MAX_WEIGHTED_SCORE = PRESENTATION_RUBRIC.reduce((acc, item) => acc + (item.weight * MAX_RATING), 0); 
const INDIV_MAX_WEIGHTED_SCORE = INDIVIDUAL_RUBRIC.reduce((acc, item) => acc + (item.weight * MAX_RATING), 0); 

type Tab = 'paper' | 'presentation' | 'individual';
type CommentCategory = 'Question' | 'Suggestion' | 'Revision';

export default function PanelCockpit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  // Data State
  const [group, setGroup] = useState<Group | null>(null);
  const [repoFiles, setRepoFiles] = useState<FileDoc[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('paper');
  const [manuscriptUrl, setManuscriptUrl] = useState<string | null>(null);
  const [showRepoModal, setShowRepoModal] = useState(false);
  const [currentUser, setCurrentUser] = useState("Panelist");

  // Grading State
  const [paperScores, setPaperScores] = useState<Record<string, number>>({});
  const [presScores, setPresScores] = useState<Record<string, number>>({});
  const [indivScores, setIndivScores] = useState<Record<string, Record<string, number>>>({}); 

  // Comments State
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CommentCategory>('Question');
  const [editingId, setEditingId] = useState<string | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // 1. FETCH DATA ON LOAD
useEffect(() => {
  const init = async () => {
    try {
      // --- A. GET USER ---
      // We need this to find WHICH evaluation in the array belongs to this person
      let user = "Panelist";
      if (typeof window !== 'undefined') {
        const storedUser = localStorage.getItem("audit_user") || localStorage.getItem("currentUser");
        if (storedUser) user = storedUser.replace(/^"|"$/g, '');
        setCurrentUser(user);
      }

      // --- B. FETCH GROUP DETAILS ---
      const allGroups: any[] = await getGroupsFromDB();
      const currentGroup = allGroups.find((g) => g._id === id);
      
      if (currentGroup) {
        setGroup(currentGroup);
        
        // Handle Files
        if (currentGroup.files && currentGroup.files.length > 0) {
            const sortedFiles = [...currentGroup.files].reverse();
            setRepoFiles(sortedFiles);
            setManuscriptUrl(sortedFiles[0].url);
        }

        // --- C. THE FIX: HANDLE 'evaluations' ARRAY ---
        const allEvaluations = currentGroup.evaluations || [];
        
        // 1. Find the evaluation specifically for THIS user
        // (If you want to see the latest regardless of user, remove the .find() and just take the last item)
        const savedEval = allEvaluations.find((e: any) => e.evaluator === user) || allEvaluations[allEvaluations.length - 1];

        if (savedEval && savedEval.scores) {
            console.log("✅ Found Saved Evaluation:", savedEval);
            
            // Load Paper Scores
            if (savedEval.scores.paperRaw) setPaperScores(savedEval.scores.paperRaw);
            
            // Load Presentation Scores
            if (savedEval.scores.presentationRaw) setPresScores(savedEval.scores.presentationRaw);
            
            // Load Individual Scores
            if (savedEval.scores.individualRaw) setIndivScores(savedEval.scores.individualRaw);
            
            // Load Comments (Handle mixed type from schema)
            if (Array.isArray(savedEval.comments)) {
                setComments(savedEval.comments);
            } else if (savedEval.comments && savedEval.comments.length > 0) {
                 // Sometimes Mixed types return odd structures, ensure it's an array
                 setComments(savedEval.comments);
            }

        } else {
            // --- D. NO SAVED DATA? SET DEFAULTS ---
            console.log("⚠️ No evaluation found for user:", user);
            if (currentGroup.members) {
               const initIndiv: any = {};
               currentGroup.members.forEach((m: string) => {
                  initIndiv[m] = {};
                  INDIVIDUAL_RUBRIC.forEach(r => initIndiv[m][r.id] = 0);
               });
               setIndivScores(initIndiv);
            }
        }
      }
    } catch (error) {
      console.error("Failed to load group data", error);
    }
  };
  init();
}, [id]);

  // Prevent accidental close with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        if (hasUnsavedChanges) {
            e.preventDefault();
            e.returnValue = '';
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // --- SCORE CALCULATIONS (NORMALIZED) ---
  const calculateNormalizedScore = (scores: Record<string, number>, rubric: any[], maxWeightedScore: number, categoryPercentage: number) => {
    let totalWeighted = 0;
    const flatItems = rubric[0]?.items ? rubric.flatMap(r => r.items) : rubric;
    
    flatItems.forEach(item => {
        const score = scores[item.id] || 0;
        totalWeighted += score * item.weight;
    });

    if (maxWeightedScore === 0) return "0.00";
    // Formula: (Earned / MaxPossible) * CategoryPercentage
    const result = ((totalWeighted / maxWeightedScore) * categoryPercentage);
    return isNaN(result) ? "0.00" : result.toFixed(2);
  };

  // PAPER: Max 65%
  const paperTotal = Number(calculateNormalizedScore(paperScores, PAPER_RUBRIC, PAPER_MAX_WEIGHTED_SCORE, 65)); 
  // PRESENTATION: Max 35%
  const presTotal = Number(calculateNormalizedScore(presScores, PRESENTATION_RUBRIC, PRES_MAX_WEIGHTED_SCORE, 35)); 
  // GRAND TOTAL: Max 100%
  const grandTotal = (paperTotal + presTotal).toFixed(2);

  // --- HANDLERS ---

  const updateScore = (setter: Function, id: string, value: number) => {
      setter((prev: any) => ({ ...prev, [id]: value }));
      setHasUnsavedChanges(true);
  };

  const updateIndivScore = (member: string, criteriaId: string, value: number) => {
      setIndivScores(prev => ({
          ...prev,
          [member]: { ...prev[member], [criteriaId]: value }
      }));
      setHasUnsavedChanges(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Blob URL for local usage
        const fakeUrl = URL.createObjectURL(file);
        setManuscriptUrl(fakeUrl);
        setShowRepoModal(false);
    }
  };

  const handleSelectRepoFile = (url: string) => {
      setManuscriptUrl(url);
      setShowRepoModal(false);
  };

  // --- SAVE TO DATABASE ---
  const handleSave = async () => {
      setIsSaving(true);
      try {
        const evaluationData = {
            groupId: id,
            evaluator: currentUser,
            scores: {
                paperRaw: paperScores, 
                presentationRaw: presScores, 
                individualRaw: indivScores, 
                paperCalculated: paperTotal,
                presentationCalculated: presTotal,
                grandTotal: grandTotal
            },
            comments: comments,
            timestamp: new Date().toISOString(),
            status: "COMPLETED"
        };

        // 🟢 SANITIZATION FIX: Ensure object is clean JSON before sending to Server Action
        const cleanPayload = JSON.parse(JSON.stringify(evaluationData));

        const result = await saveGroupEvaluation(cleanPayload);
        
        if(result && result.success) {
            setHasUnsavedChanges(false); 
            alert("✅ Evaluation Saved Successfully!");
        } else {
            throw new Error(result?.error || "Unknown error occurred");
        }
      } catch (error) {
        console.error("Save Error:", error);
        alert(`❌ Failed to save. Error: ${error instanceof Error ? error.message : "Server Error"}`);
      } finally {
        setIsSaving(false);
      }
  };

  const handleSaveComment = () => {
    if (!newComment.trim()) return;
    setHasUnsavedChanges(true);
    
    if (editingId) {
      setComments(prev => prev.map(c => c.id === editingId ? { ...c, text: newComment, category: selectedCategory } : c));
      setEditingId(null);
    } else {
      setComments([...comments, {
        id: Date.now().toString(),
        user: currentUser,
        text: newComment,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        category: selectedCategory
      }]);
    }
    setNewComment("");
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  const handleDeleteComment = (id: string) => {
    if(confirm("Delete this comment?")) {
        setComments(prev => prev.filter(c => c.id !== id));
        setHasUnsavedChanges(true);
    }
  };

  if (!group) return (
    <div className="flex h-screen items-center justify-center text-slate-400 bg-slate-50 gap-2">
        <Loader2 className="animate-spin text-blue-600"/> Loading Panel Board...
    </div>
  );

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-800 font-sans overflow-hidden">
      
      {/* HEADER */}
      <div className="h-16 bg-white border-b border-slate-200 flex items-center px-6 justify-between shrink-0 z-30 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/panel-board" className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="font-bold text-xl text-slate-800 tracking-tight">{group.groupName}</h1>
            <p className="text-xs text-slate-500 font-medium max-w-md truncate">{group.thesisTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
             {/* Unsaved Changes Indicator */}
             {hasUnsavedChanges && (
                <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200 animate-pulse">
                    <AlertOctagon size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wide">Unsaved Changes</span>
                </div>
             )}

             <div className="flex gap-4">
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Paper (65%)</div>
                    <div className="text-lg font-black text-slate-700">{paperTotal.toFixed(2)}</div>
                 </div>
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pres (35%)</div>
                    <div className="text-lg font-black text-slate-700">{presTotal.toFixed(2)}</div>
                 </div>
                 <div className="w-px bg-slate-200 h-8 self-center mx-2"></div>
                 <div className="text-right">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total</div>
                    <div className={`text-2xl font-black leading-none ${Number(grandTotal) >= 75 ? 'text-green-600' : 'text-amber-600'}`}>
                        {grandTotal}
                    </div>
                 </div>
             </div>

             <button 
                onClick={handleSave}
                disabled={isSaving}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed
                    ${hasUnsavedChanges ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200' : 'bg-slate-900 hover:bg-black text-white shadow-slate-200'}
                `}
             >
               {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
               {isSaving ? 'Saving...' : 'Save Grades'}
             </button>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANEL: MANUSCRIPT + FEEDBACK */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50 border-r border-slate-200 relative">
             
             {/* MANUSCRIPT TOOLBAR */}
             <div className="h-10 bg-white border-b border-slate-200 flex items-center justify-between px-3 shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
                    <FileText size={12}/> Document Viewer
                </span>
                <div className="flex items-center gap-2">
                    <label className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100 text-[10px] font-bold text-slate-600 transition-colors">
                        <UploadCloud size={12} /> Local Upload
                        <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button 
                        onClick={() => setShowRepoModal(!showRepoModal)} 
                        className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold transition-colors border
                        ${showRepoModal ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-transparent text-blue-600 border-transparent hover:bg-slate-100'}`}
                    >
                        <FolderOpen size={12} /> {showRepoModal ? 'Close Repository' : 'Open Repository'}
                    </button>
                </div>
             </div>

             {/* REPOSITORY MODAL (OVERLAY) */}
             {showRepoModal && (
                 <div className="absolute top-10 left-0 right-0 bg-white border-b border-slate-200 shadow-xl z-20 max-h-[300px] overflow-y-auto animate-in slide-in-from-top-2">
                     <div className="p-3 grid gap-2">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1 px-2">Available Files for {group.groupName}</div>
                        {repoFiles.length === 0 ? (
                            <div className="text-center text-xs text-slate-400 py-4 italic">No files uploaded by this group yet.</div>
                        ) : (
                            repoFiles.map((file) => (
                                <button 
                                    key={file.fileId}
                                    onClick={() => handleSelectRepoFile(file.url)}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all group
                                        ${manuscriptUrl === file.url ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-300' : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-200'}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-md shadow-sm text-blue-600"><FileText size={16} /></div>
                                        <div>
                                            <div className="text-xs font-bold text-slate-700">{file.name}</div>
                                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                                                <Clock size={10} /> {new Date(file.uploadDate).toLocaleDateString()} 
                                            </div>
                                        </div>
                                    </div>
                                    {manuscriptUrl === file.url && <CheckCircle2 size={16} className="text-blue-500" />}
                                </button>
                            ))
                        )}
                     </div>
                 </div>
             )}

             {/* PDF VIEWER - 🔴 UPDATED FOR LOCAL FILES */}
             <div className="flex-1 bg-slate-200 relative group overflow-hidden">
                {manuscriptUrl ? (
                    // If it is a local blob, use native iframe. If remote, use Google Viewer.
                    manuscriptUrl.startsWith('blob:') ? (
                        <iframe 
                            src={manuscriptUrl} 
                            className="w-full h-full" 
                            title="Local Manuscript" 
                        />
                    ) : (
                        <iframe 
                            src={`https://docs.google.com/gview?url=${encodeURIComponent(manuscriptUrl)}&embedded=true`} 
                            className="w-full h-full" 
                            title="Remote Manuscript" 
                        />
                    )
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <FileText size={48} className="mb-4 opacity-50" />
                        <p className="font-medium text-sm">No Document Selected</p>
                        <p className="text-xs text-slate-400 mt-1">Select from Repository or Upload</p>
                    </div>
                )}
             </div>

             {/* FEEDBACK LOG */}
             <div className="h-[250px] bg-white border-t border-slate-200 flex flex-col shadow-[0_-5px_15px_rgba(0,0,0,0.02)] z-10">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between shrink-0">
                     <h3 className="text-xs font-black text-slate-500 uppercase flex items-center gap-2">
                        <MessageSquare size={12} /> Feedback & Notes
                     </h3>
                     <span className="text-[9px] text-slate-400">{comments.length} items</span>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {comments.length === 0 && (
                        <div className="text-center py-4 text-xs text-slate-300 italic">No feedback added yet.</div>
                    )}
                    {comments.map((c) => (
                        <div key={c.id} className="flex gap-2 group/item">
                            <div className={`mt-0.5 min-w-[16px] 
                                ${c.category === 'Question' ? 'text-blue-500' : 
                                  c.category === 'Suggestion' ? 'text-amber-500' : 'text-red-500'}`}>
                                {c.category === 'Question' ? <HelpCircle size={14} /> : 
                                 c.category === 'Suggestion' ? <Lightbulb size={14} /> : <AlertTriangle size={14} />}
                            </div>
                            <div className="flex-1 bg-slate-50 rounded-lg p-2 border border-slate-100">
                                <div className="flex justify-between items-start">
                                    <p className="text-xs text-slate-700 leading-relaxed">{c.text}</p>
                                    <div className="flex gap-1 ml-2 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                        <button onClick={() => { setNewComment(c.text); setSelectedCategory(c.category); setEditingId(c.id); }} className="text-slate-400 hover:text-blue-600"><Edit2 size={10}/></button>
                                        <button onClick={() => handleDeleteComment(c.id)} className="text-slate-400 hover:text-red-600"><Trash2 size={10}/></button>
                                    </div>
                                </div>
                                <div className="mt-1 flex gap-2">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase">{c.category}</span>
                                    <span className="text-[9px] text-slate-300">{c.time}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={commentsEndRef}></div>
                </div>

                <div className="p-2 border-t border-slate-100 bg-white shrink-0">
                    <div className="flex gap-2 mb-2">
                        {(['Question', 'Suggestion', 'Revision'] as CommentCategory[]).map(cat => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)}
                                className={`flex-1 text-[10px] font-bold py-1 rounded border flex items-center justify-center gap-1 transition-colors
                                ${selectedCategory === cat 
                                    ? (cat === 'Question' ? 'bg-blue-50 border-blue-200 text-blue-600' : 
                                       cat === 'Suggestion' ? 'bg-amber-50 border-amber-200 text-amber-600' : 
                                       'bg-red-50 border-red-200 text-red-600')
                                    : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <input 
                            value={newComment} onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveComment()}
                            placeholder="Type your feedback here..."
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-slate-200 outline-none"
                        />
                        <button onClick={handleSaveComment} className="bg-slate-800 text-white p-2 rounded-lg hover:bg-slate-900 transition-colors">
                            {editingId ? <CheckCircle2 size={14}/> : <Send size={14}/>}
                        </button>
                        {editingId && <button onClick={() => {setEditingId(null); setNewComment("")}} className="bg-slate-100 text-slate-500 p-2 rounded-lg"><X size={14}/></button>}
                    </div>
                </div>
             </div>
        </div>

        {/* RIGHT PANEL: GRADING */}
        <div className="w-[450px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-20">
            {/* TABS */}
            <div className="flex border-b border-slate-100 shrink-0">
                <TabButton active={activeTab === 'paper'} onClick={() => setActiveTab('paper')} icon={<FileText size={14}/>} label="Paper Rubric" />
                <TabButton active={activeTab === 'presentation'} onClick={() => setActiveTab('presentation')} icon={<Presentation size={14}/>} label="Presentation" />
                <TabButton active={activeTab === 'individual'} onClick={() => setActiveTab('individual')} icon={<Users size={14}/>} label="Individual" />
            </div>

            {/* CONTENT */}
            <div className="flex-1 overflow-y-auto bg-slate-50/30 custom-scrollbar p-5">
                
                {/* PAPER TAB */}
                {activeTab === 'paper' && PAPER_RUBRIC.map((section, idx) => (
                    <div key={idx} className="mb-8 animate-in fade-in duration-300">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">{section.title}</h3>
                        <div className="space-y-6">
                            {section.items.map((item) => (
                                <RubricSlider 
                                    key={item.id} data={item}
                                    value={paperScores[item.id] || 0}
                                    onChange={(v) => updateScore(setPaperScores, item.id, v)}
                                />
                            ))}
                        </div>
                    </div>
                ))}

                {/* PRESENTATION TAB */}
                {activeTab === 'presentation' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-4">
                            <h3 className="text-blue-800 font-bold text-sm">Oral Presentation</h3>
                            <p className="text-blue-600 text-xs">Rate the group's performance (Total 35%)</p>
                        </div>
                        {PRESENTATION_RUBRIC.map((item) => (
                            <RubricSlider 
                                key={item.id} data={item}
                                value={presScores[item.id] || 0}
                                onChange={(v) => updateScore(setPresScores, item.id, v)}
                            />
                        ))}
                    </div>
                )}

                {/* INDIVIDUAL TAB */}
                {activeTab === 'individual' && (
                    <div className="space-y-6 animate-in fade-in duration-300">
                        {(!group.members || group.members.length === 0) && (
                            <div className="text-center text-slate-400 py-10 text-xs">No members listed for this group.</div>
                        )}
                        {group?.members?.map((member: string, mIdx: number) => {
                             // Use normalized calculation for individual grade (Out of 100%)
                             let rawWeighted = 0;
                             INDIVIDUAL_RUBRIC.forEach(r => rawWeighted += (indivScores[member]?.[r.id] || 0) * r.weight);
                             const percentage = ((rawWeighted / INDIV_MAX_WEIGHTED_SCORE) * 100).toFixed(1);

                             return (
                                <div key={mIdx} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600">{member.charAt(0)}</div>
                                            <span className="font-bold text-sm text-slate-700">{member}</span>
                                        </div>
                                        <span className={`text-sm font-black ${Number(percentage) >= 75 ? 'text-green-600' : 'text-slate-400'}`}>{isNaN(Number(percentage)) ? '0.0' : percentage}%</span>
                                    </div>
                                    <div className="p-4 space-y-6">
                                        {INDIVIDUAL_RUBRIC.map((crit) => (
                                            <RubricSlider 
                                                key={crit.id} data={crit}
                                                value={indivScores[member]?.[crit.id] || 0}
                                                onChange={(v) => updateIndivScore(member, crit.id, v)}
                                            />
                                        ))}
                                    </div>
                                </div>
                             )
                        })}
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB COMPONENTS ---

function TabButton({ active, onClick, icon, label }: any) {
    return (
        <button onClick={onClick} className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold border-b-2 transition-all ${active ? 'border-blue-600 text-blue-600 bg-blue-50/50' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
            {icon} {label}
        </button>
    )
}

function RubricSlider({ data, value, onChange }: { data: any, value: number, onChange: (v: number) => void }) {
    const scoreColor = value >= 4 ? 'text-green-600' : value >= 3 ? 'text-blue-600' : value >= 2 ? 'text-amber-500' : 'text-red-500';

    return (
        <div className="group">
            <div className="flex justify-between items-end mb-2">
                <div>
                    <h4 className="font-bold text-xs text-slate-700">{data.label}</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Weight: x{data.weight}</p>
                </div>
                <div className="text-right">
                    <span className={`text-lg font-black ${value > 0 ? scoreColor : 'text-slate-200'}`}>
                        {value > 0 ? value.toFixed(1) : "0.0"}
                    </span>
                    <span className="text-[9px] text-slate-300 ml-1">/ 5.0</span>
                </div>
            </div>
            
            <input 
                type="range" min="0" max="5" step="0.5" 
                value={value} 
                onChange={(e) => onChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-800 hover:accent-blue-600 transition-all"
            />
            <div className="flex justify-between mt-1 text-[8px] text-slate-300 uppercase font-bold">
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
            </div>
        </div>
    );
}