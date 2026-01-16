"use client";
import React, { useState, useEffect } from 'react';
import { 
  Users, ArrowUpDown, Search, UserCheck, 
  ChevronRight, ArrowUpAZ, ArrowDownZA 
} from 'lucide-react';
import { getGroupsFromDB } from "@/app/actions";

interface StudentEntry {
  id: string;
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
        const groups = await getGroupsFromDB();
        
        const flattened: StudentEntry[] = groups.flatMap((g: any) => 
            g.members.filter((m: string) => m.trim() !== "").map((fullName: string, index: number) => {
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
                lastName: last,
                firstName: first,
                fullName: fullName,
                groupName: g.groupName
            };
            })
        );
  setStudents(flattened);
  setLoading(false);
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
    <div className="max-w-7xl mx-auto space-y-6 p-10 animate-in fade-in duration-700">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-6xl font-medium tracking-tight">
            Student <span className="text-slate-300 italic">Masterlist</span>
          </h1>
          <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
            <UserCheck size={18} className="text-blue-500" />
            Total Registered Students: <span className="text-slate-900">{students.length}</span>
          </p>
        </div>

        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search by name or group..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-3xl shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </header>

      {/* Table Container */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20 text-center">#</th>
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
                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold group-hover:bg-blue-600 group-hover:text-white transition-all">
                      {student.groupName}
                      <ChevronRight size={12} />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}