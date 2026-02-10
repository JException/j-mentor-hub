"use client";

import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, UploadCloud, Search, FolderOpen, 
  ChevronDown, ExternalLink, X, Loader2, Download 
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

interface Group {
  _id: string;
  groupName: string;
  thesisTitle: string;
  files?: FileDoc[]; 
}

// Define the expected response from the server action
interface UploadResponse {
  success: boolean;
  file?: FileDoc;
  error?: string;
}

export default function FilesPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  
  // UI State
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadTargetGroupId, setUploadTargetGroupId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const data = await getGroupsFromDB();
        if (data) setGroups(JSON.parse(JSON.stringify(data)));
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
        // Automatically select the most recent file
        const latestFile = group.files[group.files.length - 1]; 
        setActiveFileId(latestFile.fileId);
      }
    }
  };

  const handleUploadClick = (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation(); 
    setUploadTargetGroupId(groupId);
    // Slight delay to ensure state updates before click
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
      // 1. Upload to Vercel Blob (via our API)
      const response = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}`,
        {
          method: 'POST',
          body: file,
        }
      );

      const blobData = await response.json();
      
      if (!response.ok) throw new Error(blobData.error || "Upload failed");

      const fileUrl = blobData.url; 

      // 2. Save URL to MongoDB
      // We explicitly cast the result to our expected type
      const result = await addFileToGroup(targetId, fileUrl) as UploadResponse;

      if (result && result.success && result.file) {
        const newFileDoc = result.file;
        
        // Optimistically update the UI
        setGroups(prev => prev.map(g => {
            if(g._id === targetId) {
                // Safely handle if g.files is undefined or not an array
                const currentFiles = Array.isArray(g.files) ? g.files : [];
                const updatedFiles = [...currentFiles, newFileDoc];
                return { ...g, files: updatedFiles };
            }
            return g;
        }));
        
        setActiveFileId(newFileDoc.fileId);
        // Optional: Ensure the accordion is open on the group we just uploaded to
        if (expandedGroupId !== targetId) {
            setExpandedGroupId(targetId);
        }
        
        alert("✅ Upload Successful!");
      } else {
        // Fallback error message if result.error is missing
        throw new Error(result?.error || "Database save failed (Unknown Error)"); 
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
    
    // Optimistic UI Update
    setGroups(prev => prev.map(g => {
      if (g._id === groupId) {
        return { ...g, files: (g.files || []).filter(f => f.fileId !== fileId) };
      }
      return g;
    }));
    
    if (activeFileId === fileId) setActiveFileId(null);
    
    await removeFileFromGroup(groupId, fileId);
  };

  const filteredGroups = groups.filter(g => 
    g.groupName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.thesisTitle || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto pb-12">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange}
        style={{ display: 'none' }} 
        accept="application/pdf"
      />

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FolderOpen className="text-blue-600" size={32} />
          Files Repository
        </h1>
        <p className="text-slate-500 mt-2">Manage thesis documents!</p>
        
        <div className="mt-6 relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Search groups..." 
            className="w-full bg-white border border-slate-200 pl-12 pr-4 py-3 rounded-xl shadow-sm outline-none focus:border-blue-500 transition-all font-medium"
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
             No groups found.
           </div>
        ) : (
          filteredGroups.map(group => {
            const isExpanded = expandedGroupId === group._id;
            // Create a reversed copy for display so newest files are first (optional)
            // Safely handle if group.files is undefined
            const files = Array.isArray(group.files) ? [...group.files].reverse() : []; 
            const currentFile = files.find(f => f.fileId === activeFileId);

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
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-widest
                        ${isExpanded ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}
                      `}>
                        {group.groupName}
                      </span>
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
                      className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {/* File List Horizontal Scroll */}
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

                        {/* PDF Viewer */}
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
                            <div className="h-[650px] bg-white relative">
                               <iframe 
                                 src={`https://docs.google.com/gview?url=${encodeURIComponent(currentFile.url)}&embedded=true`}
                                 className="w-full h-full"
                                 frameBorder="0"
                               />
                               {/* Fallback/Alternative embed method if Google Viewer is blocked or fails */}
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