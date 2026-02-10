"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { 
  UploadCloud, FileText, CheckCircle, AlertCircle, 
  Loader2, ChevronRight, X, FolderOpen, Database, 
  BookOpen, PenTool, MapPin, Activity, HelpCircle,
  GraduationCap, Users, ArrowLeft, Search, Clock, Download
} from 'lucide-react';
import { getGroupsFromDB } from "@/app/actions"; 

// --- Interfaces ---
interface ScanResult {
  score: number;
  found: string[];
  missing: string[];
  wordCount: number;
  fileName: string;
  styleIssues?: { word: string; type: string; locations?: string[] }[];
  citationAnalysis?: {
    totalCitations: number;
    missingRefs: { text: string; locations?: string[] }[];
  };
  readability?: {
    gradeLevel: number;
    stats: { sentences: number; words: number };
  };
  acronyms?: {
      defined: string[];
      undefined: string[];
  };
  figures?: {
      count: number;
      orphans: string[];
  };
  readinessScore: {
    overall: number;
    factors: {
      label: string;
      score: number;
      status: 'pass' | 'warning' | 'fail';
      message: string;
    }[];
  };
  referenceRecency?: {
    total: number;
    last5Years: number;
    older: number;
    percentageRecent: number;
    yearsFound: number[];
  };
}

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
    panelists?: {
        chair?: string;
        internal?: string;
        external?: string;
    };
    files?: FileDoc[]; 
}

// --- CONSTANTS ---
// This constant controls the Role Filtering Logic
const CURRENT_USER = "Dr. Cruz"; 

// --- Helper Functions ---
const getReadabilityColor = (grade: number) => {
  if (grade >= 12 && grade <= 16) return 'bg-green-500';
  if (grade > 18) return 'bg-red-400';
  return 'bg-orange-400';
};

const getReadabilityMessage = (grade: number) => {
  if (grade < 12) return "Writing is too simple. Aim for academic depth.";
  if (grade >= 12 && grade <= 16) return "Perfect academic complexity.";
  return "Very dense. Consider shortening sentences.";
};

const formatUploadDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, { 
    month: 'short', day: 'numeric', year: 'numeric' 
  });
};

export default function ThesisScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  // Repository State
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const [repoGroups, setRepoGroups] = useState<Group[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Repository Flow
  const [repoStep, setRepoStep] = useState<'role' | 'files'>('role');
  const [selectedRole, setSelectedRole] = useState<'mentee' | 'non-mentee' | null>(null);

  // Animated Score Effect
  useEffect(() => {
    if (result && result.score > 0) {
      let start = 0;
      const end = result.score;
      const duration = 1000; 
      const incrementTime = duration / end;

      const timer = setInterval(() => {
        start += 1;
        setAnimatedScore(start);
        if (start === end) clearInterval(timer);
      }, incrementTime);

      return () => clearInterval(timer);
    } else {
      setAnimatedScore(0);
    }
  }, [result]);

  const scanFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setIsRepoOpen(false); 

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const VALID_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (!VALID_TYPES.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) {
        setError("Invalid file type. Please upload a PDF or DOCX.");
        setLoading(false);
        return;
    }

    if (file.size > MAX_SIZE) {
        setError("File is too large (Max 10MB). Please compress it.");
        setLoading(false);
        return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/scan', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to scan document");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      scanFile(e.target.files[0]);
    }
  };

  const openRepository = () => {
    setIsRepoOpen(true);
    setRepoStep('role');
    setSelectedRole(null);
    setRepoGroups([]); 
    setSearchTerm(""); 
    setError(null);
  };

  // --- UPDATED LOADING LOGIC ---
  const handleRoleSelect = async (role: 'mentee' | 'non-mentee') => {
    setSelectedRole(role);
    setRepoStep('files');
    setSearchTerm(""); 
    setLoadingRepo(true);
    setRepoGroups([]); // Clear previous data to prevent stale state

    try {
      // We fetch 'all' groups and filter on the client side based on the logic below.
      // This allows the UI to switch roles efficiently if we cache the data later.
      const rawData = await getGroupsFromDB('all'); 
      
      if (rawData && Array.isArray(rawData)) {
        // Pre-processing:
        // 1. Ensure 'files' array exists
        // 2. Ensure 'panelists' object exists (to prevent crashes in filtering)
        // 3. Remove groups that have no files
        const processedGroups = rawData.map((group) => ({ 
            ...group, 
            files: group.files || [],
            panelists: group.panelists || { chair: '', internal: '', external: '' }
        })).filter(group => group.files.length > 0);

        setRepoGroups(processedGroups);
      } else {
        setRepoGroups([]);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load files from database.");
    } finally {
      setLoadingRepo(false);
    }
  };

  const handleRepoSelect = async (fileUrl: string, fileName: string) => {
    try {
        setLoading(true); 
        setIsRepoOpen(false); 
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const file = new File([blob], fileName, { type: blob.type });
        await scanFile(file);
    } catch (err) {
        setError("Could not download file from repository.");
        setLoading(false);
    }
  };

  const handleBackToRoles = () => {
      setRepoStep('role');
      setRepoGroups([]); 
      setSelectedRole(null);
      setSearchTerm("");
  };

  // --- UPDATED SEARCH & FILTER LOGIC ---
  const filteredRepoGroups = useMemo(() => {
    // We strictly use the CURRENT_USER constant for filtering
    const currentUserLower = CURRENT_USER.toLowerCase();
    const lowerTerm = searchTerm.toLowerCase();

    return repoGroups.map(group => {
        // --- A. Role Determination ---
        // Combine all panelist names into one searchable string
        const p = group.panelists || {};
        const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
        
        // If the current user is found in the panelist string, they are a Panelist.
        // If NOT found, they are assumed to be a Mentee (Adviser/Student context).
        const isPanelist = panelistString.includes(currentUserLower);

        // --- B. Tab Filter ---
        // 1. User clicked "Mentee Files" -> Show groups where user is NOT a panelist
        if (selectedRole === 'mentee' && isPanelist) return null;
        
        // 2. User clicked "Non-Mentee Files" -> Show groups where user IS a panelist
        if (selectedRole === 'non-mentee' && !isPanelist) return null;

        // --- C. Search Filter ---
        if (!searchTerm) return group; // No search term, return valid group

        // Check Group Name or Thesis Title
        const matchesGroup = group.groupName.toLowerCase().includes(lowerTerm) || 
                             (group.thesisTitle || "").toLowerCase().includes(lowerTerm);

        // Check specific file names
        const matchingFiles = (group.files || []).filter(f => 
            f.name.toLowerCase().includes(lowerTerm)
        );

        // If group matches, return full group. If only files match, return group with filtered files.
        if (matchesGroup) return group;
        if (matchingFiles.length > 0) return { ...group, files: matchingFiles };

        return null; // No match found
    })
    .filter((group): group is Group => group !== null); // Remove null entries
  }, [repoGroups, searchTerm, selectedRole]);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Upload Box */}
      <div className="bg-white p-10 rounded-3xl shadow-xl border-2 border-dashed border-slate-200 hover:border-blue-400 transition-all text-center group relative">
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-blue-50 text-blue-600 rounded-full group-hover:scale-110 transition-transform">
            <UploadCloud size={40} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-700">Upload Thesis PDF</h3>
            <p className="text-slate-400 mt-1 text-sm">Drag & drop or click to browse</p>
          </div>
          <input type="file" accept=".pdf,.docx" onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
           <div className="flex items-center gap-4 w-full max-w-xs opacity-50">
             <div className="h-px bg-slate-300 flex-1"></div>
             <span className="text-xs font-bold text-slate-400">OR</span>
             <div className="h-px bg-slate-300 flex-1"></div>
           </div>
           <button onClick={(e) => { e.preventDefault(); openRepository(); }} className="z-20 flex items-center gap-2 bg-slate-800 text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-slate-900 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1">
             <Database size={16} /> Select from Repository
           </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-12 animate-pulse">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={32} />
          <p className="text-slate-500 font-medium">Analyzing structure, tone, and citations...</p>
        </div>
      )}

      {error && !isRepoOpen && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-in slide-in-from-top-2">
          <AlertCircle size={24} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* RESULTS DASHBOARD */}
      {result && !loading && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex items-center justify-between">
            <div>
               <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                 <FileText className="text-blue-500" /> {result.fileName}
               </h2>
               <p className="text-slate-400 text-sm mt-1">{result.wordCount.toLocaleString()} words found</p>
            </div>
            <div className={`text-4xl font-black ${result.score === 100 ? 'text-green-500' : result.score > 50 ? 'text-blue-500' : 'text-orange-500'}`}>
              {animatedScore}%
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">

          {/* READABILITY CARD */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 md:col-span-2 relative overflow-visible">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                        <Activity size={20} />
                    </div>
                    <h3 className="font-bold text-slate-700">Readability Score</h3>
                </div>
                
                {result.readability ? (
                    <div className="flex items-end gap-4">
                        <div>
                            <span className="text-4xl font-black text-slate-800">
                                {result.readability.gradeLevel}
                            </span>
                            <span className="text-sm text-slate-400 font-medium ml-1">Grade Level</span>
                        </div>
                        
                        <div className="mb-1.5 flex-1">
                            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${getReadabilityColor(result.readability.gradeLevel)}`}
                                    style={{ width: `${Math.min(100, (result.readability.gradeLevel / 20) * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {getReadabilityMessage(result.readability.gradeLevel)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <p className="text-slate-400 italic text-sm">Readability data not available.</p>
                )}
            </div>
            
            {/* Structure Analysis */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-lg border-b border-slate-100 pb-2">
                    <FolderOpen className="text-blue-500" size={20} /> Structure Check
                </h3>
                <div className="grid md:grid-cols-2 gap-6">
                    <div>
                        <span className="text-xs font-bold text-green-600 uppercase tracking-wider mb-2 block">Present</span>
                        <ul className="space-y-2">
                            {result.found.map((item) => (
                            <li key={item} className="flex items-center gap-2 text-slate-600 text-sm">
                                <CheckCircle size={14} className="text-green-500" /> {item}
                            </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2 block">Missing</span>
                         {result.missing.length === 0 ? (
                           <p className="text-green-600 text-sm italic">Perfect structure!</p>
                         ) : (
                            <ul className="space-y-2">
                                {result.missing.map((item) => (
                                <li key={item} className="flex items-center gap-2 text-slate-600 text-sm">
                                    <X size={14} className="text-red-500" /> {item}
                                </li>
                                ))}
                            </ul>
                         )}
                    </div>
                </div>
            </div>

            {/* Tone Police */}
            <div className="bg-orange-50/50 p-6 rounded-2xl border border-orange-100">
              <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                <PenTool size={20} /> Tone Police
              </h3>
              
              {(!result.styleIssues || result.styleIssues.length === 0) ? (
                 <p className="text-green-600 font-medium italic">Academic tone looks great!</p>
              ) : (
                <div className="space-y-4">
                   <p className="text-xs text-orange-600">Avoid these non-academic terms:</p>
                   {result.styleIssues.map((issue, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-orange-100">
                          <div className="flex items-center justify-between mb-2">
                             <span className="font-bold text-slate-700 text-lg">"{issue.word}"</span>
                             <span className="text-[10px] uppercase font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded-full">{issue.type}</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                             {(issue.locations || []).map((loc, i) => (
                                <span key={i} className="flex items-center gap-1 text-[11px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                   <MapPin size={10} /> {loc}
                                </span>
                             ))}
                          </div>
                      </div>
                   ))}
                </div>
              )}
            </div>

            {/* Citation Detective */}
            <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100">
              <h3 className="font-bold text-blue-800 mb-4 flex items-center gap-2">
                <BookOpen size={20} /> Citation Detective
              </h3>
              
              <div className="flex items-center justify-between mb-4 bg-white p-3 rounded-lg border border-blue-100">
                 <span className="text-sm text-slate-500">Total Citations Found</span>
                 <span className="font-bold text-blue-600 text-lg">{result.citationAnalysis?.totalCitations || 0}</span>
              </div>

              {(!result.citationAnalysis || result.citationAnalysis.missingRefs.length === 0) ? (
                 <p className="text-green-600 font-medium italic text-sm">All in-text citations found in References.</p>
              ) : (
                <div>
                   <p className="text-xs text-red-500 font-bold mb-3 uppercase tracking-wide">Citations missing from References:</p>
                   <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                      {result.citationAnalysis.missingRefs.map((ref, idx) => (
                          <div key={idx} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm">
                             <div className="flex items-start gap-2 mb-2">
                                <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" /> 
                                <span className="text-red-700 font-semibold text-sm">{ref.text}</span>
                             </div>
                             <div className="pl-6 flex flex-wrap gap-2">
                                 {(ref.locations || []).map((loc, i) => (
                                     <span key={i} className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
                                          Found: {loc}
                                     </span>
                                 ))}
                             </div>
                          </div>
                      ))}
                   </div>
                </div>
              )}
            </div>

          </div>
          {/* ACRONYM AUDITOR */}
            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
                    <span className="text-xs border border-emerald-200 px-1.5 rounded">ABC</span> Acronym Auditor
                </h3>
                
                {result.acronyms ? (
                    <div className="space-y-4">
                        {result.acronyms.undefined.length === 0 ? (
                            <p className="text-emerald-600 italic text-sm">All acronyms appear defined!</p>
                        ) : (
                            <div>
                                <p className="text-xs text-emerald-600 font-bold mb-2 uppercase tracking-wide">Potentially Undefined:</p>
                                <div className="flex flex-wrap gap-2">
                                    {result.acronyms.undefined.map((acr, i) => (
                                        <span key={i} className="bg-white text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-100 shadow-sm">
                                            {acr}
                                        </span>
                                    ))}
                                </div>
                                <p className="text-[10px] text-emerald-400 mt-2 italic">* We looked for patterns like "{result.acronyms.undefined[0]} (Definition)"</p>
                            </div>
                        )}
                        <div className="pt-3 border-t border-emerald-100 flex justify-between text-xs text-emerald-600">
                             <span>Defined Found: {result.acronyms.defined.length}</span>
                             <span className="opacity-50">Checked 3+ letter caps</span>
                        </div>
                    </div>
                ) : <p className="text-sm text-slate-400">No acronym data.</p>}
            </div>

            {/* FIGURE & TABLE CHECKER */}
            <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100">
                <h3 className="font-bold text-indigo-800 mb-4 flex items-center gap-2">
                    <Database size={18} /> Figure Checker
                </h3>

                {result.figures ? (
                    <div className="space-y-4">
                         <div className="flex items-center justify-between bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                             <span className="text-sm text-slate-500">Captions Found</span>
                             <span className="font-bold text-indigo-600 text-lg">{result.figures.count}</span>
                         </div>

                         {result.figures.orphans.length === 0 ? (
                             <p className="text-emerald-600 text-sm italic font-medium flex items-center gap-2">
                                <CheckCircle size={14} /> All mentions have captions.
                             </p>
                         ) : (
                             <div>
                                <p className="text-xs text-red-500 font-bold mb-2 flex items-center gap-1">
                                    <AlertCircle size={12} /> Broken References (Orphans):
                                </p>
                                <ul className="space-y-1">
                                    {result.figures.orphans.map((orphan, i) => (
                                        <li key={i} className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-100 flex justify-between">
                                            <span>You said "see <b>{orphan}</b>"</span>
                                            <span className="italic opacity-70">but caption missing</span>
                                        </li>
                                    ))}
                                </ul>
                             </div>
                         )}
                    </div>
                ) : <p className="text-sm text-slate-400">No figure data.</p>}
            </div>
            {/* PANEL READINESS SCORE */}
<div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl md:col-span-2 overflow-hidden relative">
  <div className="relative z-10">
    <div className="flex justify-between items-start mb-8">
      <div>
        <h3 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <CheckCircle className="text-emerald-400" /> Panel Readiness
        </h3>
        <p className="text-slate-400 text-sm mt-1">Simulated defense readiness based on common panel criteria</p>
      </div>
      <div className="text-right">
        <span className="text-5xl font-black text-emerald-400">{result.readinessScore.overall}%</span>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {result.readinessScore.factors.map((factor, i) => (
        <div key={i} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">{factor.label}</span>
            <span className={`h-2 w-2 rounded-full ${
              factor.status === 'pass' ? 'bg-emerald-500' : 
              factor.status === 'warning' ? 'bg-orange-500' : 'bg-red-500'
            }`} />
          </div>
          <p className="text-sm font-medium leading-tight">{factor.message}</p>
        </div>
      ))}
    </div>
  </div>
  {/* Abstract background decoration */}
  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl"></div>
</div>

{/* REFERENCE RECENCY CARD */}
<div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Activity size={20} className="text-indigo-500" /> Reference Recency
    </h3>
    {result.referenceRecency ? (
        <div className="space-y-4">
            <div className="flex items-end justify-between">
                <div>
                    <span className="text-3xl font-black text-slate-800">{result.referenceRecency.percentageRecent}%</span>
                    <span className="text-xs text-slate-400 block font-bold uppercase tracking-tighter">Post-2020 Sources</span>
                </div>
                <div className="text-right">
                    <span className="text-xs font-bold text-slate-500 block">Total Sources Found</span>
                    <span className="text-lg font-bold">{result.referenceRecency.total}</span>
                </div>
            </div>
            
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div 
                    className="bg-indigo-500 h-full transition-all duration-1000" 
                    style={{ width: `${result.referenceRecency.percentageRecent}%` }}
                />
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed italic">
                {result.referenceRecency.percentageRecent > 70 
                    ? "Excellent! Your research is highly contemporary." 
                    : "Tip: Panels may ask why you're relying on older citations. Try to include 2024-2026 papers."}
            </p>
        </div>
    ) : <p className="text-slate-400 italic">No reference data found.</p>}
</div>
        </div>
      )}

      {/* REPOSITORY MODAL */}
      {isRepoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                <Database className="text-blue-600" size={20} /> 
                {repoStep === 'role' ? "Mentee or not?" : `Selecting as: ${selectedRole}`}
              </h3>
              <button onClick={() => setIsRepoOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-4">
              
              {/* STEP 1: ROLE SELECTION */}
              {repoStep === 'role' && (
                <div className="grid grid-cols-2 gap-4 h-full py-8">
                  <button 
                    onClick={() => handleRoleSelect('mentee')}
                    className="flex flex-col items-center justify-center p-6 bg-blue-50 border-2 border-blue-100 rounded-2xl hover:border-blue-500 hover:shadow-lg transition-all group gap-3"
                  >
                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <GraduationCap size={40} className="text-blue-600" />
                    </div>
                    <span className="font-bold text-lg text-slate-700">Mentee Files</span>
                    <span className="text-xs text-slate-500">Access my group's files</span>
                  </button>

                  <button 
                    onClick={() => handleRoleSelect('non-mentee')}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-slate-500 hover:shadow-lg transition-all group gap-3"
                  >
                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Users size={40} className="text-slate-600" />
                    </div>
                    <span className="font-bold text-lg text-slate-700">Non-mentee Files</span>
                    <span className="text-xs text-slate-500">Browse files for paneling</span>
                  </button>
                </div>
              )}

              {/* STEP 2: FILE LIST */}
              {repoStep === 'files' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <button 
                        onClick={handleBackToRoles}
                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                        <ArrowLeft size={12} /> Back to role selection
                    </button>

                    <div className="flex items-center gap-3">
                          {/* Role Badge */}
                        <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider ${
                            selectedRole === 'mentee' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                            Viewing: {selectedRole}
                        </span>

                        {/* Search Bar */}
                        <div className="relative">
                            <input 
                                type="text" 
                                placeholder="Filter files..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 w-40 md:w-48"
                            />
                            <Search size={14} className="absolute left-2.5 top-2 text-slate-400" />
                        </div>
                    </div>
                  </div>

                  {loadingRepo ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                          <Loader2 className="animate-spin text-blue-500" size={32} />
                          <span className="text-sm text-slate-400">Loading {selectedRole} files...</span>
                    </div>
                  ) : filteredRepoGroups.length === 0 ? (
                      <div className="text-center py-12 text-slate-400">
                          <FolderOpen size={48} className="mx-auto mb-2 opacity-20" />
                          <p>No files found for this category.</p>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          {filteredRepoGroups.map((group) => (
                              <div key={group._id} className="border border-slate-200 rounded-xl overflow-hidden">
                                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                      <span className="font-bold text-slate-700 text-sm">{group.groupName}</span>
                                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">
                                          {(group.files || []).length} Files
                                      </span>
                                  </div>
                                  <div className="divide-y divide-slate-100">
                                      {(group.files || []).map((file) => (
                                          <button 
                                              key={file.fileId} 
                                              onClick={() => handleRepoSelect(file.url, file.name)}
                                              className="w-full text-left p-3 hover:bg-blue-50 flex items-center justify-between group transition-colors"
                                          >
                                              <div className="flex items-center gap-3">
                                                  <div className="bg-white p-2 rounded-lg border border-slate-100 text-slate-400 group-hover:text-blue-500 group-hover:border-blue-200 transition-colors">
                                                      <FileText size={16} />
                                                  </div>
                                                  <div>
                                                      <p className="text-sm font-medium text-slate-700 group-hover:text-blue-700">{file.name}</p>
                                                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                                          <Clock size={10} /> {formatUploadDate(file.uploadDate)}
                                                      </div>
                                                  </div>
                                              </div>
                                              <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}