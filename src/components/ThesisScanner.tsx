"use client";

import React, { useState } from 'react';
import { 
  UploadCloud, FileText, CheckCircle, AlertCircle, 
  Loader2, ChevronRight, X, FolderOpen, Database, 
  BookOpen, PenTool, MapPin, Activity, HelpCircle,
  GraduationCap, Users, ArrowLeft
} from 'lucide-react';
import { getGroupsFromDB } from "@/app/actions"; 

// ... [Keep your interfaces ScanResult, FileDoc, Group here] ...
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
    files?: FileDoc[]; 
}

export default function ThesisScanner() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Repository State
  const [isRepoOpen, setIsRepoOpen] = useState(false);
  const [repoGroups, setRepoGroups] = useState<Group[]>([]);
  const [loadingRepo, setLoadingRepo] = useState(false);
  
  // Repository Flow
  const [repoStep, setRepoStep] = useState<'role' | 'files'>('role');
  const [selectedRole, setSelectedRole] = useState<'mentee' | 'non-mentee' | null>(null);

  const scanFile = async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);
    setIsRepoOpen(false); 

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

  // FIX 1: Ensure absolute cleanup when opening
  const openRepository = () => {
    setIsRepoOpen(true);
    setRepoStep('role');
    setSelectedRole(null);
    setRepoGroups([]); 
    setError(null);
  };

  // FIX 2: Debugging and stricter state handling
  const handleRoleSelect = async (role: 'mentee' | 'non-mentee') => {
    // 1. Immediate UI Updates
    setSelectedRole(role);
    setRepoStep('files');
    setRepoGroups([]); // Clear old data immediately
    setLoadingRepo(true);
    
    try {
      console.log(`Fetching files for role: ${role}...`);
      
      // 2. Fetch Data
      const data = await getGroupsFromDB(role); 
      
      console.log("Data received from DB:", data); // Check your console to see if this is filtered!

      // 3. Update State (Safety Check)
      if (data && Array.isArray(data)) {
        // Deep copy to prevent reference issues
        setRepoGroups(JSON.parse(JSON.stringify(data)));
      } else {
        console.error("Invalid data format received:", data);
        setRepoGroups([]);
      }
    } catch (err) {
      console.error("Failed to load repo", err);
      setError("Failed to load repository files.");
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

  // Helper to go back safely
  const handleBackToRoles = () => {
      setRepoStep('role');
      setRepoGroups([]); // Clear files so they don't flash when returning
      setSelectedRole(null);
  };

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
        <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 border border-red-100">
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
              {result.score}%
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
                                    className={`h-full rounded-full transition-all duration-1000 ${
                                        result.readability.gradeLevel >= 12 && result.readability.gradeLevel <= 16 
                                        ? 'bg-green-500' 
                                        : result.readability.gradeLevel > 18 
                                        ? 'bg-red-400' 
                                        : 'bg-orange-400'
                                    }`}
                                    style={{ width: `${Math.min(100, (result.readability.gradeLevel / 20) * 100)}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-2">
                                {result.readability.gradeLevel < 12 && "Writing is too simple. Aim for academic depth."}
                                {result.readability.gradeLevel >= 12 && result.readability.gradeLevel <= 16 && "Perfect academic complexity."}
                                {result.readability.gradeLevel > 16 && "Very dense. Consider shortening sentences."}
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
                {repoStep === 'role' ? "Who are you?" : `Selecting as: ${selectedRole}`}
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
                    <span className="font-bold text-lg text-slate-700">I am a Mentee</span>
                    <span className="text-xs text-slate-500">Access my group's files</span>
                  </button>

                  <button 
                    onClick={() => handleRoleSelect('non-mentee')}
                    className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl hover:border-slate-500 hover:shadow-lg transition-all group gap-3"
                  >
                    <div className="bg-white p-4 rounded-full shadow-sm group-hover:scale-110 transition-transform">
                      <Users size={40} className="text-slate-600" />
                    </div>
                    <span className="font-bold text-lg text-slate-700">I am a Non-Mentee</span>
                    <span className="text-xs text-slate-500">Browse public repository</span>
                  </button>
                </div>
              )}

              {/* STEP 2: FILE LIST */}
              {repoStep === 'files' && (
                <div className="space-y-3">
                  <button 
                    onClick={handleBackToRoles}
                    className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1 mb-2"
                  >
                    <ArrowLeft size={12} /> Back to role selection
                  </button>

                  {loadingRepo ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-3">
                         <Loader2 className="animate-spin text-blue-500" size={32} />
                         <span className="text-sm text-slate-400">Loading {selectedRole} files...</span>
                    </div>
                  ) : repoGroups.length === 0 ? (
                      <p className="text-center text-slate-400 py-10">
                        {error ? error : `No files found for ${selectedRole}.`}
                      </p>
                  ) : (
                    repoGroups.map(group => {
                        // Safe check to prevent rendering empty groups
                        if(!group.files || group.files.length === 0) return null;
                        
                        return (
                          <div key={group._id} className="border border-slate-200 rounded-xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
                             <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">{group.groupName}</span>
                                <span className="text-xs text-slate-400 font-mono truncate max-w-[200px]">{group.thesisTitle}</span>
                             </div>
                             <div className="divide-y divide-slate-100">
                                {group.files.slice().reverse().map(file => (
                                  <button key={file.fileId} onClick={() => handleRepoSelect(file.url, file.name)} className="w-full text-left px-4 py-3 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                      <FileText size={18} className="text-slate-400 group-hover:text-blue-500" />
                                      <span className="text-sm font-medium text-slate-700 group-hover:text-blue-700 truncate max-w-[250px] md:max-w-md">{file.name}</span>
                                    </div>
                                    <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                                  </button>
                                ))}
                             </div>
                          </div>
                        );
                    })
                  )}
                  {!loadingRepo && repoGroups.length > 0 && (
                      <div className="p-3 bg-slate-50 text-center text-xs text-slate-400 border-t border-slate-100 mt-4 rounded-lg">Select a file to automatically scan it</div>
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