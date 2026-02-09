"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, UploadCloud, Search, FolderOpen, 
  ChevronDown, ExternalLink, X, Loader2, Download,
  HardDrive, Gavel, UserCheck, LayoutGrid
} from 'lucide-react';
import { getGroupsFromDB, addFileToGroup, removeFileFromGroup } from "@/app/actions"; 

// --- TYPES ---
interface FileDoc {
  fileId: string;
  name: string;
  type: string;
  uploadDate: string;
  url: string; 
}

interface Panelists {
    chair?: string;
    internal?: string;
    external?: string;
}

interface Group {
  _id: string;
  groupName: string;
  thesisTitle: string;
  files?: FileDoc[]; 
  panelists?: Panelists; // Added panelists to check role
}

interface UploadResponse {
  success: boolean;
  file?: FileDoc;
  error?: string;
}

// Storage Interface
interface StorageStats {
    usedMB: number;
    totalMB: number;
    percentage: number;
}

export default function FilesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState("");
  
  // Filter State: 'all' | 'mentee' | 'panelist'
  const [filterMode, setFilterMode] = useState<'all' | 'mentee' | 'panelist'>('all');

  // UI State
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTargetGroupId, setUploadTargetGroupId] = useState<string | null>(null);
  
  // Storage State
  const [storageStats, setStorageStats] = useState<StorageStats>({ usedMB: 0, totalMB: 1024, percentage: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Get Current User
  useEffect(() => {
    const storedUser = localStorage.getItem("audit_user") || localStorage.getItem("currentUser");
    if (storedUser) {
        setCurrentUser(storedUser.replace(/^"|"$/g, ''));
    }
  }, []);

  // 2. Fetch Groups
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroupsFromDB();
        if (data) setGroups(JSON.parse(JSON.stringify(data)));
        
        // Simulated Storage Stats
        setTimeout(() => {
            const used = 27.7; 
            const total = 1024; 
            setStorageStats({ 
                usedMB: used, 
                totalMB: total, 
                percentage: (used / total) * 100 
            });
        }, 1000);

      } catch (error) {
        console.error("Failed to load groups", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const toggleAccordion = (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      setActiveFileId(null);
    } else {
      setExpandedGroupId(groupId);
      const group = groups.find(g => g._id === groupId);
      if (group && group.files && group.files.length > 0) {
        const latestFile = group.files[group.files.length - 1]; 
        setActiveFileId(latestFile.fileId);
      }
    }
  };

  const handleUploadClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation(); 
    setUploadTargetGroupId(groupId);
    setTimeout(() => {
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; 
            fileInputRef.current.click();
        }
    }, 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const targetId = uploadTargetGroupId || expandedGroupId || "";
    if (!targetId) return;

    const file = e.target.files[0];
    setIsUploading(true);

    try {
      // 1. Upload to Vercel Blob
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        { method: 'POST', body: file }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error (${response.status}): ${errorText || "Unknown Error"}`);
      }

      const blobData = await response.json();
      const fileUrl = blobData.url;

      // 2. Save URL to MongoDB
      const result = await addFileToGroup(targetId, fileUrl) as UploadResponse;

      if (result.success && result.file) {
        const newFileDoc = result.file;
        
        setGroups(prev => prev.map(g => {
            if(g._id === targetId) {
                const updatedFiles = [...(g.files || []), newFileDoc];
                return { ...g, files: updatedFiles };
            }
            return g;
        }));
        
        setActiveFileId(newFileDoc.fileId);
        if (expandedGroupId !== targetId) {
            setExpandedGroupId(targetId);
        }
        
        // Optimistically update storage
        setStorageStats(prev => {
             const newUsed = prev.usedMB + (file.size / 1024 / 1024);
             return {
                 ...prev,
                 usedMB: parseFloat(newUsed.toFixed(2)),
                 percentage: (newUsed / prev.totalMB) * 100
             };
        });

        alert("✅ Upload Successful!");
      } else {
        throw new Error(result.error || "Database save failed"); 
      }

    } catch (error: any) {
      console.error(error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadTargetGroupId(null);
    }
  };

  const handleDeleteFile = async (groupId: string, fileId: string) => {
    if(!confirm("Delete this file?")) return;
    
    setGroups(prev => prev.map(g => {
      if (g._id === groupId) {
        return { ...g, files: (g.files || []).filter(f => f.fileId !== fileId) };
      }
      return g;
    }));
    
    if (activeFileId === fileId) setActiveFileId(null);
    
    await removeFileFromGroup(groupId, fileId);
  };

  // --- FILTERING LOGIC ---
  const filteredGroups = groups.filter(g => {
    // 1. Search Filter
    const matchesSearch = g.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (g.thesisTitle || "").toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Role Determination
    // Check if user is in the panelist list
    const p = g.panelists || {};
    const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
    
    // User keywords (handle partial matches or first names)
    const myNameKeywords = [currentUser, "Pura", "Justine", "Jude"].filter(Boolean).map(n => n.toLowerCase());
    
    const isPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));
    const isMentee = !isPanelist; // Default assumption: if not panelist, you are mentee/adviser

    // 3. Tab Filter
    if (filterMode === 'mentee' && !isMentee) return false;
    if (filterMode === 'panelist' && !isPanelist) return false;

    return matchesSearch;
  });

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        style={{ display: 'none' }} 
        accept="application/pdf"
      />

      {/* HEADER SECTION */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <FolderOpen className="text-blue-600" size={32} />
            Files Repository
            </h1>
            <p className="text-slate-500 mt-2">Manage thesis documents for mentees & panels.</p>
        </div>

        {/* --- STORAGE CARD --- */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm w-full md:w-64">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-slate-600 font-bold text-xs uppercase tracking-wider">
                    <HardDrive size={14} className="text-slate-400"/>
                    <span>Storage</span>
                </div>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">
                    HOBBY PLAN
                </span>
            </div>
            
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mb-2">
                <div 
                    className={`h-full rounded-full transition-all duration-1000 ${
                        storageStats.percentage > 90 ? 'bg-red-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.max(storageStats.percentage, 2)}%` }} 
                />
            </div>
            
            <div className="flex justify-between text-xs">
                <span className="font-bold text-slate-700">{storageStats.usedMB} MB Used</span>
                <span className="text-slate-400">of 1 GB</span>
            </div>
        </div>
      </div>
        
      {/* CONTROLS: TABS & SEARCH */}
      <div className="mt-6 mb-8 flex flex-col md:flex-row gap-4">
          
          {/* Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl font-bold text-xs md:text-sm">
             <button 
                onClick={() => setFilterMode('all')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${filterMode === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <LayoutGrid size={16} /> All Files
             </button>
             <button 
                onClick={() => setFilterMode('mentee')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${filterMode === 'mentee' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <UserCheck size={16} /> My Mentees
             </button>
             <button 
                onClick={() => setFilterMode('panelist')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${filterMode === 'panelist' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
                <Gavel size={16} /> Panelist
             </button>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Search groups..." 
              className="w-full bg-white border border-slate-200 pl-12 pr-4 py-2.5 md:py-3 rounded-xl shadow-sm outline-none focus:border-blue-500 transition-all font-medium"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
           <div className="text-center py-12 text-slate-400 flex flex-col items-center gap-2">
             <Loader2 className="animate-spin text-blue-500" size={24} />
             Loading database...
           </div>
        ) : filteredGroups.length === 0 ? (
           <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             No groups found matching your criteria.
           </div>
        ) : (
          filteredGroups.map(group => {
            const isExpanded = expandedGroupId === group._id;
            const files = [...(group.files || [])].reverse(); 
            const currentFile = files.find(f => f.fileId === activeFileId);
            
            // Re-calculate role for Badge Display
            const p = group.panelists || {};
            const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
            const myNameKeywords = [currentUser, "Pura", "Justine", "Jude"].filter(Boolean).map(n => n.toLowerCase());
            const isPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));

            return (
              <div 
                key={group._id}
                className={`bg-white border rounded-2xl transition-all overflow-hidden
                  ${isExpanded ? 'border-blue-400 ring-4 ring-blue-50 shadow-lg' : 'border-slate-200 shadow-sm hover:border-blue-300'}
                `}
              >
                <div 
                  onClick={() => toggleAccordion(group._id)}
                  className="p-5 cursor-pointer flex items-center justify-between gap-4 bg-white relative z-10"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3 mb-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest
                        ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}
                      `}>
                        {group.groupName}
                      </span>
                      
                      {/* --- ROLE BADGE --- */}
                      {isPanelist ? (
                         <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-orange-50 text-orange-600 border border-orange-100">
                            <Gavel size={10} /> Panelist
                         </span>
                      ) : (
                         <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tight bg-green-50 text-green-700 border border-green-100">
                            <UserCheck size={10} /> Mentee Group
                         </span>
                      )}

                      {files.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                          <FileText size={10} /> {files.length} File{files.length !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-lg text-slate-800">
                      {group.thesisTitle || "Untitled Thesis Project"}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <button 
                      onClick={(e) => handleUploadClick(e, group._id)}
                      disabled={isUploading}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed hidden md:flex"
                    >
                      {isUploading && (uploadTargetGroupId === group._id) ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud size={16} /> UPLOAD PDF
                        </>
                      )}
                    </button>
                    <div className={`text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={24} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/50 p-4 md:p-6">
                    {/* Mobile Upload Button (Visible only when expanded on mobile) */}
                    <button 
                      onClick={(e) => handleUploadClick(e, group._id)}
                      disabled={isUploading}
                      className="flex md:hidden w-full items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-4 py-3 rounded-xl text-xs font-bold mb-4 shadow-sm"
                    >
                       <UploadCloud size={16} /> UPLOAD NEW PDF
                    </button>

                    {files.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white">
                        <p className="text-sm font-semibold mb-3">No documents in database.</p>
                        <button 
                          onClick={(e) => handleUploadClick(e, group._id)}
                          className="text-blue-600 font-bold text-sm hover:underline"
                        >
                          Upload First Draft
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {files.map(file => (
                            <div 
                              key={file.fileId}
                              onClick={() => setActiveFileId(file.fileId)}
                              className={`
                                flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold whitespace-nowrap cursor-pointer border transition-all select-none
                                ${activeFileId === file.fileId
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
                                  : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600'
                                }
                              `}
                            >
                              <FileText size={14} />
                              <span className="max-w-[150px] truncate">{file.name}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteFile(group._id, file.fileId); }}
                                className={`ml-2 p-1 rounded-full hover:bg-white/20 ${activeFileId === file.fileId ? 'text-blue-100' : 'text-slate-300 hover:text-red-500'}`}
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ))}
                        </div>

                        {currentFile && (
                          <div className="bg-slate-900 rounded-xl overflow-hidden shadow-xl border border-slate-800">
                            <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                              <span className="text-xs text-slate-300 font-mono truncate max-w-md">
                                {currentFile.name}
                              </span>
                              <div className="flex items-center gap-3">
                                <a 
                                  href={currentFile.url} 
                                  download
                                  className="text-xs font-bold text-blue-400 hover:text-white flex items-center gap-1"
                                >
                                  <Download size={12}/> Download
                                </a>
                                <a 
                                  href={currentFile.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs font-bold text-slate-400 hover:text-white flex items-center gap-1"
                                >
                                  Open in Tab <ExternalLink size={12}/> 
                                </a>
                              </div>
                            </div>
                            <div className="h-[500px] md:h-[650px] bg-white relative">
                               <iframe 
                                 src={`https://docs.google.com/gview?url=${encodeURIComponent(currentFile.url)}&embedded=true`}
                                 className="w-full h-full"
                                 frameBorder="0"
                               />
                               <object
                                data={currentFile.url}
                                type="application/pdf"
                                className="absolute inset-0 w-full h-full pointer-events-none opacity-0"
                               >
                               </object>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}