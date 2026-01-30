"use client";
import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowUpDown, Search, UserCheck, 
  ChevronRight, ArrowRight
} from 'lucide-react';
import Link from 'next/link'; // Import Link for navigation
import { getGroupsFromDB } from "@/app/actions";

interface StudentEntry {
  id: string;
  groupId: string; // Added groupId to link to the specific page
  lastName: string;
  firstName: string;
  fullName: string;
  groupName: string;
}

export default function StudentMasterlist() {
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState<{ key: keyof StudentEntry, direction: 'asc' | 'desc' }>({
    key: 'lastName',
    direction: 'asc'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const groups = await getGroupsFromDB();
        
        const flattened: StudentEntry[] = groups.flatMap((g: any) => 
          g.members
            .filter((m: string) => m.trim() !== "")
            .map((fullName: string, index: number) => {
              let last = "";
              let first = "";

              // List of common suffixes to treat as part of the Last Name
              const suffixes = ["jr.", "jr", "sr.", "sr", "iii", "ii", "iv"];

              if (fullName.includes(',')) {
                // Handle "Que, Adrian Dominic T." format
                const parts = fullName.split(',');
                last = parts[0].trim();
                first = parts.slice(1).join(',').trim();
              } else {
                // Handle "Adrian Dominic T. Aldave Jr." format
                const nameParts = fullName.trim().split(/\s+/);
                const lastIndex = nameParts.length - 1;
                const potentialSuffix = nameParts[lastIndex]?.toLowerCase().replace('.', '');

                if (nameParts.length > 2 && suffixes.includes(potentialSuffix)) {
                  // EXCEPTION: Take the last TWO words if a suffix is detected
                  last = `${nameParts[lastIndex - 1]} ${nameParts[lastIndex]}`;
                  first = nameParts.slice(0, lastIndex - 1).join(' ');
                } else if (nameParts.length > 1) {
                  // Standard: Take only the last word
                  last = nameParts[lastIndex];
                  first = nameParts.slice(0, lastIndex).join(' ');
                } else {
                  last = fullName;
                  first = "N/A";
                }
              }

              return {
                id: `${g._id}-${index}`,
                groupId: g._id.toString(), // Capture Group ID
                lastName: last,
                firstName: first,
                fullName: fullName,
                groupName: g.groupName
              };
            })
        );
        setStudents(flattened);
      } catch (error) {
        console.error("Failed to fetch students:", error);
      } finally {
        setLoading(false);
      }
    };  
    fetchData();
  }, []);

  // Sorting Logic
  const handleSort = (key: keyof StudentEntry) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedStudents = [...students]
    .filter(s => 
      s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      s.groupName.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = String(a[sortConfig.key]).toLowerCase();
      const bValue = String(b[sortConfig.key]).toLowerCase();
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 md:p-10 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Section */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-6xl font-medium tracking-tight text-slate-900">
              Student <span className="text-slate-300 italic">Masterlist</span>
            </h1>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2 text-sm md:text-base">
              <UserCheck size={18} className="text-blue-500" />
              Total Registered Students: <span className="text-slate-900 font-bold">{students.length}</span>
            </p>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text"
              placeholder="Search by name or group..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-6 py-3 md:py-4 bg-white border border-slate-200 rounded-3xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all text-sm md:text-base"
            />
          </div>
        </header>

        {/* --- MOBILE VIEW (Cards) --- */}
        <div className="md:hidden flex flex-col gap-4">
          {loading ? (
             <div className="p-8 text-center text-slate-400 text-sm">Loading records...</div>
          ) : sortedStudents.map((student, index) => (
             <div key={student.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                   <div>
                      <h3 className="font-bold text-lg text-slate-800 leading-tight">{student.lastName}</h3>
                      <p className="text-slate-500 text-sm">{student.firstName}</p>
                   </div>
                   <span className="text-[10px] font-mono font-bold text-slate-300 bg-slate-50 px-2 py-1 rounded-lg">
                      #{String(index + 1).padStart(3, '0')}
                   </span>
                </div>
                
                <hr className="border-slate-50" />

                <Link href={`/groups/${student.groupId}`} className="group flex items-center justify-between bg-slate-50 hover:bg-blue-600 hover:text-white p-3 rounded-2xl transition-all duration-300">
                   <span className="text-xs font-bold truncate max-w-[200px]">{student.groupName}</span>
                   <div className="bg-white group-hover:bg-white/20 p-1.5 rounded-full text-slate-400 group-hover:text-white transition-colors">
                      <ArrowRight size={14} />
                   </div>
                </Link>
             </div>
          ))}
        </div>

        {/* --- DESKTOP VIEW (Table) --- */}
        <div className="hidden md:block bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-center">#</th>
                  <th 
                    className="p-6 font-bold text-slate-800 cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('lastName')}
                  >
                    <div className="flex items-center gap-2">
                      Last Name <ArrowUpDown size={14} className="text-slate-300" />
                    </div>
                  </th>
                  <th 
                    className="p-6 font-bold text-slate-800 cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-2">
                      First Name <ArrowUpDown size={14} className="text-slate-300" />
                    </div>
                  </th>
                  <th 
                    className="p-6 font-bold text-slate-800 cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => handleSort('groupName')}
                  >
                    <div className="flex items-center gap-2">
                      Thesis Group <ArrowUpDown size={14} className="text-slate-300" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-20 text-center text-slate-400 font-medium">Loading records...</td>
                  </tr>
                ) : sortedStudents.map((student, index) => (
                  <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="p-6 text-center text-xs font-mono text-slate-400 group-hover:text-blue-600 font-bold">
                      {(index + 1).toString().padStart(2, '0')}
                    </td>
                    <td className="p-6 font-bold text-slate-700">{student.lastName}</td>
                    <td className="p-6 text-slate-500">{student.firstName}</td>
                    <td className="p-6">
                      <Link href={`/groups/${student.groupId}`}>
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-all cursor-pointer">
                          {student.groupName}
                          <ChevronRight size={12} />
                        </span>
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