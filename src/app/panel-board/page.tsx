"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Users, Calendar, Plus, X, 
  Trash2, Edit2, CheckCircle2, 
  Clock, FileText, ChevronRight, GraduationCap, Activity
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const CURRENT_USER_NAME = "Mr. Justine Jude C. Pura";

// --- TYPES ---
interface Group {
  id: string;
  name: string;
  title: string;
  members: string[];
  section: string;
  adviser: string;
  defenseDate: string;
  defenseTime: string;
  status: 'Pending' | 'Evaluated';
  hasManuscript: boolean;
  panelChair: string;
  panelInternal: string;
  panelExternal: string;
}

export default function PanelDashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // ✅ Added 'status' to form data
  const [formData, setFormData] = useState({
    name: '', title: '', section: '', adviser: '', 
    defenseDate: '', defenseTime: '', 
    status: 'Pending', // Default
    member1: '', member2: '', member3: '', member4: '',
    panelChair: '',
    panelInternal: '',
    panelExternal: ''
  });

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/groups?view=panel&t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error("Server failed");

        const data = await res.json();
        
        const formatted = data.map((g: any) => ({
          id: g._id,
          name: g.groupName || "Untitled", 
          title: g.thesisTitle || "No Title",
          members: g.members || [],
          section: g.sections?.[0] || "",
          adviser: g.advisers?.seAdviser || "",
          defenseDate: g.defense?.date || "",
          defenseTime: g.defense?.time || "",
          status: g.defense?.status || "Pending",
          hasManuscript: g.files && g.files.length > 0,
          panelChair: g.panelists?.chair || "",
          panelInternal: g.panelists?.internal || "",
          panelExternal: g.panelists?.external || ""
        }));
        
        setGroups(formatted);
      } catch (error) {
        console.error("Failed to fetch groups", error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroups();
  }, []);

  const router = useRouter();

  // --- HANDLERS ---
  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '', title: '', section: '', adviser: '', 
      defenseDate: '', defenseTime: '', 
      status: 'Pending',
      member1: '', member2: '', member3: '', member4: '',
      panelChair: '', 
      panelInternal: CURRENT_USER_NAME, 
      panelExternal: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (group: Group, e: React.MouseEvent) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setEditingGroup(group);
    setFormData({
      name: group.name,
      title: group.title,
      section: group.section,
      adviser: group.adviser,
      defenseDate: group.defenseDate,
      defenseTime: group.defenseTime,
      // @ts-ignore
      status: group.status, // Load existing status
      member1: group.members[0] || '',
      member2: group.members[1] || '',
      member3: group.members[2] || '',
      member4: group.members[3] || '',
      panelChair: group.panelChair,
      panelInternal: group.panelInternal,
      panelExternal: group.panelExternal
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(!confirm("Are you sure you want to delete this group?")) return;
    
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error("Delete failed");
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Fetch error:", error);
      alert("Failed to delete group.");
    }
  };

  const handleSave = async () => {
   const membersList = [formData.member1, formData.member2, formData.member3, formData.member4].filter(m => m.trim() !== "");
   const internalPanelist = editingGroup ? formData.panelInternal : (formData.panelInternal || CURRENT_USER_NAME);

   const payload = {
  groupName: formData.name, // Ensure this matches Schema (groupName vs name)
  thesisTitle: formData.title,
  sections: [formData.section], // Schema expects an array of strings?
  
  advisers: {
    seAdviser: formData.adviser
  },

  // 👇 FIX: Nest these inside a 'defense' object
  defense: {
    date: formData.defenseDate,
    time: formData.defenseTime,
    status: formData.status
  },

  members: membersList,
  
  panelists: {
    chair: formData.panelChair,
    internal: internalPanelist, 
    external: formData.panelExternal
  }
};

   try {
     const url = editingGroup ? `/api/groups/${editingGroup.id}` : '/api/groups';
     const method = editingGroup ? 'PUT' : 'POST';

     const res = await fetch(url, {
        method: method,
        body: JSON.stringify(payload)
     });
     
     if (!res.ok) throw new Error("Save failed");
     
     window.location.reload(); 
   } catch (error) {
     console.error("Error saving group", error);
     alert("Failed to save changes.");
   }
};

  const total = groups.length;
  const evaluated = groups.filter(g => g.status === 'Evaluated').length;
  const pending = total - evaluated;
  const filteredGroups = groups.filter(g => (filter === 'All' || g.status === filter) && g.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans selection:bg-blue-100">
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-slate-50 -z-10" />

      <main className="max-w-7xl mx-auto p-6 md:p-8">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
                <GraduationCap className="text-white" size={24} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Panel Board</h1>
            </div>
            <p className="text-slate-500 font-medium ml-1">Manage evaluations and upcoming defenses.</p>
          </div>
          
          <button 
            onClick={handleOpenCreate}
            className="group bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-3 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300"
          >
            <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> 
            <span>Register Group</span>
          </button>
        </div>

        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <StatCard label="Assigned Groups" value={loading ? '-' : total} icon={<Users className="text-blue-600" />} color="bg-blue-50 border-blue-100" />
          <StatCard label="Evaluated" value={loading ? '-' : evaluated} icon={<CheckCircle2 className="text-emerald-600" />} color="bg-emerald-50 border-emerald-100" />
          <StatCard label="Pending Defense" value={loading ? '-' : pending} icon={<Clock className="text-amber-600" />} color="bg-amber-50 border-amber-100" />
        </div>

        {/* TOOLBAR */}
        <div className="bg-white/80 backdrop-blur-md sticky top-4 z-30 p-4 rounded-2xl border border-slate-200 shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
            {['All', 'Pending', 'Evaluated'].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200 ${
                  filter === f 
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-auto group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search group name..." 
              className="w-full sm:w-72 pl-11 pr-4 py-3 bg-white rounded-xl border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>

        {/* LOADING & EMPTY STATES */}
        {loading && (
          <div className="text-center py-20 text-slate-400">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"/>
            <p>Loading your groups...</p>
          </div>
        )}

        {!loading && filteredGroups.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-slate-300" size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700">No groups found</h3>
            <p className="text-slate-400 text-sm">Try adjusting your filters or search query.</p>
          </div>
        )}

        {/* GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Link href={`/panel-board/${group.id}`} key={group.id} className="group relative block">
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1 transition-all duration-300 h-full flex flex-col overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-1 ${group.status === 'Evaluated' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 translate-x-2 group-hover:translate-x-0 duration-200">
                  <button 
                    onClick={(e) => handleOpenEdit(group, e)}
                    className="p-2 bg-white border border-slate-100 shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 rounded-lg transition-all"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={(e) => handleDelete(group.id, e)}
                    className="p-2 bg-white border border-slate-100 shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 rounded-lg transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className="flex justify-between items-start mb-5">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                    group.status === 'Evaluated' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                      : 'bg-amber-50 text-amber-700 border-amber-100'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${group.status === 'Evaluated' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {group.status}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 border border-slate-100 bg-slate-50 px-2 py-1 rounded-md">
                    {group.section}
                  </span>
                </div>

                <div className="flex-1 mb-6">
                  <h3 className="font-bold text-xl text-slate-800 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {group.name}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4 font-medium">
                    {group.title}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                   {group.members.map((m, i) => (
                      <span key={`${m}-${i}`} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-600 px-2 py-1 rounded-md font-semibold">
                      {m}
                      </span>
                   ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Defense Date</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-0.5">
                        <Calendar size={12} className="text-blue-500" />
                        {group.defenseDate ? new Date(group.defenseDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'}
                        <span className="text-slate-300 mx-1">|</span>
                        {group.defenseTime || '--:--'}
                      </div>
                    </div>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      group.hasManuscript ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                     {group.hasManuscript ? <FileText size={14} /> : <ChevronRight size={16} />}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {editingGroup ? 'Edit Group Details' : 'Register New Group'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">Fill in the information below.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 bg-white border border-slate-200 rounded-full text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-all">
                <X size={20} />
              </button>
            </div>

            <div className="p-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <InputGroup label="Group Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="e.g. ByteMe" />
                  <InputGroup label="Section" value={formData.section} onChange={v => setFormData({...formData, section: v})} placeholder="e.g. TN31" />
                </div>
                
                <InputGroup label="Thesis Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder="Full thesis title..." />

                <div className="p-5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                    <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest flex items-center gap-2">
                        <Users size={12} /> Panelists (Assign to see in view)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <InputGroup label="Chair" value={formData.panelChair} onChange={v => setFormData({...formData, panelChair: v})} placeholder="Panel Chair" />
                        <InputGroup label="Internal" value={formData.panelInternal} onChange={v => setFormData({...formData, panelInternal: v})} placeholder="Internal Panel" />
                        <InputGroup label="External" value={formData.panelExternal} onChange={v => setFormData({...formData, panelExternal: v})} placeholder="External Panel" />
                    </div>
                </div>

                <div className="p-5 bg-slate-50 rounded-xl border border-slate-100 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Calendar size={12} /> Schedule & Status
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Defense Date" type="date" value={formData.defenseDate} onChange={v => setFormData({...formData, defenseDate: v})} />
                        <InputGroup label="Time" type="time" value={formData.defenseTime} onChange={v => setFormData({...formData, defenseTime: v})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InputGroup label="Adviser" value={formData.adviser} onChange={v => setFormData({...formData, adviser: v})} placeholder="Adviser Name" />
                        
                        {/* 🟢 NEW: STATUS DROPDOWN */}
                        <div className="space-y-2">
                           <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Defense Status</label>
                           <select 
                             value={formData.status} 
                             onChange={(e) => setFormData({...formData, status: e.target.value})}
                             className="input-field cursor-pointer appearance-none"
                           >
                             <option value="Pending">Pending</option>
                             <option value="Evaluated">Evaluated</option>
                           </select>
                        </div>
                    </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Team Members</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[1,2,3,4].map((num) => (
                        <input 
                            key={num}
                            className="input-field" 
                            placeholder={`Member ${num}`}
                            // @ts-ignore
                            value={formData[`member${num}`]} 
                            // @ts-ignore
                            onChange={e => setFormData({...formData, [`member${num}`]: e.target.value})} 
                        />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 flex gap-3 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors text-sm">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm">
                {editingGroup ? 'Save Changes' : 'Register Group'}
              </button>
            </div>

          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
          transition: all 0.2s;
          background: #fff;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

function StatCard({ label, value, icon, color }: any) {
  return (
    <div className={`p-6 rounded-2xl border ${color} flex items-center gap-5 shadow-sm transition-transform hover:-translate-y-1`}>
       <div className="p-3 bg-white rounded-xl shadow-sm border border-slate-100">{icon}</div>
       <div>
         <p className="text-3xl font-black text-slate-800 tracking-tight">{value}</p>
         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">{label}</p>
       </div>
    </div>
  );
}

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
      />
    </div>
  );
}