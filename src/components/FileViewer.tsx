"use client";

import React, { useState } from 'react';
import { X, ExternalLink, Loader2 } from 'lucide-react'; 

interface FileViewerProps {
  file: {
    name: string;
    url: string;
    type?: string; 
  } | null;
  onClose: () => void;
}

export default function FileViewer({ file, onClose }: FileViewerProps) {
  const [isLoading, setIsLoading] = useState(true);

  if (!file) return null;

  // Simple check to see if it's a PDF or Image
  const isPDF = file.type === 'PDF' || file.url.toLowerCase().endsWith('.pdf');
  const isImage = file.type === 'IMG' || file.url.match(/\.(jpeg|jpg|gif|png)$/) != null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900 truncate pr-4">{file.name}</h3>
          <div className="flex items-center gap-2">
            <a 
              href={file.url} 
              target="_blank" 
              rel="noreferrer"
              className="p-2 text-gray-500 hover:text-blue-600 rounded-full"
              title="Open in new tab"
            >
              <ExternalLink size={20} />
            </a>
            <button 
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 rounded-full"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="flex-1 relative bg-gray-100 flex items-center justify-center p-0 overflow-hidden">
          
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-gray-100">
               <span className="text-gray-500 animate-pulse">Loading Preview...</span>
            </div>
          )}

          {isPDF ? (
            /* ⭐ THE FIX: Using Google Docs Viewer to render the PDF ⭐ */
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(file.url)}&embedded=true`}
              className="w-full h-full border-none"
              title="PDF Preview"
              onLoad={() => setIsLoading(false)}
            />
          ) : isImage ? (
            <img 
              src={file.url} 
              alt={file.name} 
              className="max-w-full max-h-full object-contain"
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="text-center">
              <p className="mb-4">Cannot preview this file type.</p>
              <a href={file.url} target="_blank" className="text-blue-600 underline">Download File</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}