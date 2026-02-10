"use client";
import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowUpDown, Search, UserCheck, 
  ChevronRight, ArrowRight, CheckCircle2, Circle,
  CrossIcon,
  PanelBottomCloseIcon
} from 'lucide-react';
import Link from 'next/link';
import { getGroupsFromDB } from "@/app/actions";

interface StudentEntry {
  id: string;
  groupId: string;
  lastName: string;
  firstName: string;
  fullName: string;
  groupName: string;
  isMentee: boolean; // New Field
}

export default function StudentMasterlist() {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  
  // 'all' | 'mentee' | 'not-mentee'
  const [filterMode, setFilterMode] = useState<'all' | 'mentee' | 'not-mentee'>('all'); 
  
  const [sortConfig, setSortConfig] = useState<{ key: keyof StudentEntry, direction: 'asc' | 'desc' }>({
    key: 'lastName',
    direction: 'asc'
  });

  // 1. Get Current User
  useEffect(() => {
    const storedUser = localStorage.getItem("audit_user") || localStorage.getItem("currentUser");
    if (storedUser) {
        setCurrentUser(storedUser.replace(/^"|"$/g, ''));
    }
  }, []);

  // 2. Fetch Data & Determine Status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const groups = await getGroupsFromDB();
        
        // Define keywords for the current user
        const myNameKeywords = [currentUser, "Pura", "Justine", "Jude"].filter(Boolean).map(n => n.toLowerCase());

        const flattened: StudentEntry[] = groups.flatMap((g: any) => {
            
            // --- DETERMINE MENTEE STATUS ---
            // Logic: If you are NOT a panelist, you are presumed to be the Adviser (Mentee)
            const p = g.panelists || {};
            const panelistString = `${p.chair || ''} ${p.internal || ''} ${p.external || ''}`.toLowerCase();
            const amIPanelist = myNameKeywords.some(keyword => panelistString.includes(keyword));
            const isMenteeGroup = !amIPanelist; 

            return g.members
            .filter((m: string) => m.trim() !== "")
            .map((fullName: string, index: number) => {
              let last = "";
              let first = "";

              const suffixes = ["jr.", "jr", "sr.", "sr", "iii", "ii", "iv"];

              if (fullName.includes(',')) {
                const parts = fullName.split(',');
                last = parts[0].trim();
                first = parts.slice(1).join(',').trim();
              } else {
                const nameParts = fullName.trim().split(/\s+/);
                const lastIndex = nameParts.length - 1;
                const potentialSuffix = nameParts[lastIndex]?.toLowerCase().replace('.', '');

                if (nameParts.length > 2 && suffixes.includes(potentialSuffix)) {
                  last = `${nameParts[lastIndex - 1]} ${nameParts[lastIndex]}`;
                  first = nameParts.slice(0, lastIndex - 1).join(' ');
                } else if (nameParts.length > 1) {
                  last = nameParts[lastIndex];
                  first = nameParts.slice(0, lastIndex).join(' ');
                } else {
                  last = fullName;
                  first = "N/A";
                }
              }

              return {
                id: `${g._id}-${index}`,
                groupId: g._id.toString(),
                lastName: last,
                firstName: first,
                fullName: fullName,
                groupName: g.groupName,
                isMentee: isMenteeGroup
              };
            });
        });
        setStudents(flattened);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoading(false);
      }
    };  
    
    // Only fetch once user is identified (or if user is empty, fetch anyway)
    fetchData();
  }, [currentUser]);

  // 3. Sorting & Filtering Logic
  const handleSort = (key: keyof StudentEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedStudents = [...students]
    // Filter by Search
    .filter(s => 
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.groupName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    // Filter by Toggle Mode
    .filter(s => {
        if (filterMode === 'mentee') return s.isMentee;
        if (filterMode === 'not-mentee') return !s.isMentee;
        return true; // 'all'
    })
    // Sort
    .sort((a, b) => {
      const aValue = String(a[sortConfig.key]).toLowerCase();
      const bValue = String(b[sortConfig.key]).toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight text-slate-900">
              Student <span className="text-blue-600">Masterlist</span>
            </h1>
            <p className="text-slate-500 mt-2 text-sm md:text-base flex items-center gap-2">
               Total: <span className="font-bold text-slate-900">{processedStudents.length}</span> students found
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full md:w-auto">
             {/* Toggle Filters */}
             <div className="bg-slate-200/60 p-1 rounded-xl flex text-xs font-bold">
                <button 
                    onClick={() => setFilterMode('all')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${filterMode === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    All
                </button>
                <button 
                    onClick={() => setFilterMode('mentee')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${filterMode === 'mentee' ? 'bg-white text-green-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    My Mentees
                </button>
                <button 
                    onClick={() => setFilterMode('not-mentee')}
                    className={`flex-1 px-4 py-2 rounded-lg transition-all ${filterMode === 'not-mentee' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Others
                </button>
             </div>

             {/* Search */}
             <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text"
                  placeholder="Search student or group..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                />
             </div>
          </div>
        </div>

        {/* --- MOBILE VIEW (Compact Cards) --- */}
        <div className="md:hidden grid gap-3">
          {loading ? (
             <div className="p-8 text-center text-slate-400 text-xs">Loading records...</div>
          ) : processedStudents.map((student, index) => (
             <div key={student.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <div className="flex gap-3">
                        <div className="mt-1">
                            {student.isMentee ? 
                                <CheckCircle2 size={16} className="text-green-500" /> : 
                                <Circle size={16} className="text-slate-300" />
                            }
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">{student.lastName}, {student.firstName}</h3>
                            <div className="text-xs text-slate-500 mt-0.5">{student.groupName}</div>
                        </div>
                   </div>
                   <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                      #{index + 1}
                   </span>
                </div>
                
                <Link href={`/groups/${student.groupId}`} className="mt-1 flex items-center justify-center gap-2 w-full py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold hover:bg-blue-600 hover:text-white transition-colors">
                   View Profile <ArrowRight size={12} />
                </Link>
             </div>
          ))}
        </div>

        {/* --- DESKTOP VIEW (Compact Table) --- */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold text-center w-16">#</th>
                  <th className="py-3 px-4 font-bold text-center w-24">Status</th>
                  <th 
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center gap-1">
                      Last Name <ArrowUpDown size={12} className="text-slate-300" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      First Name <ArrowUpDown size={12} className="text-slate-300" />
                    </div>
                  </th>
                  <th 
                    className="py-3 px-4 font-bold cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('groupName')}
                  >
                    <div className="flex items-center gap-1">
                      Thesis Group <ArrowUpDown size={12} className="text-slate-300" />
                    </div>
                  </th>
                  <th className="py-3 px-4 font-bold text-center w-24">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-slate-400">Loading records...</td>
                  </tr>
                ) : processedStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="py-3 px-4 text-center text-xs font-mono text-slate-400 group-hover:text-blue-600">
                      {(index + 1)}
                    </td>
                    <td className="py-3 px-4 text-center">
                        {student.isMentee ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-50 border border-green-200 text-green-700 text-[10px] font-bold uppercase tracking-tight">
                                <CheckCircle2 size={10} /> Mentee
                            </span>
                        ) : (
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-md bg-red-50 border border-slate-200 text-slate-800 text-[8px] font-bold uppercase tracking-tight">
                                <PanelBottomCloseIcon size={9} /> Non-mentee
                            </span>
                        )}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-700">{student.lastName}</td>
                    <td className="py-3 px-4 text-slate-600">{student.firstName}</td>
                    <td className="py-3 px-4 text-slate-600 text-xs font-medium">
                        <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-100">
                            {student.groupName}
                        </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link href={`/groups/${student.groupId}`}>
                        <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-blue-600 hover:text-white transition-all">
                          <ChevronRight size={14} />
                        </div>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}