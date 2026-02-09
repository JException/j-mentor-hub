"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Search, Users, Calendar, Plus, X, 
  Trash2, Edit2, CheckCircle2, 
  Clock, FileText 
} from 'lucide-react';

// --- TYPES (Matches your DB Schema) ---
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
}

export default function PanelDashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '', title: '', section: '', adviser: '', 
    defenseDate: '', defenseTime: '', 
    member1: '', member2: '', member3: '', member4: ''
  });

  // --- MOCK DATA LOAD (Replace with useEffect + fetch('/api/groups')) ---
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups?view=panel', { cache: 'no-store' });
        const data = await res.json();
        
        // Map DB data to your UI format
        const formatted = data.map((g: any) => ({
          id: g._id,
          name: g.groupName,
          title: g.thesisTitle,
          members: g.members,
          section: g.sections?.[0] || "",
          adviser: g.advisers?.seAdviser || "",
          defenseDate: g.defense?.date || "",
          defenseTime: g.defense?.time || "",
          status: g.defense?.status || "Pending",
          hasManuscript: g.files && g.files.length > 0
        }));
        
        setGroups(formatted);
      } catch (error) {
        console.error("Failed to fetch groups", error);
      }
    };
  
    fetchGroups();
  }, []);

  // --- HANDLERS ---

  // 1. Open Modal for Create
  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '', title: '', section: '', adviser: '', 
      defenseDate: '', defenseTime: '', 
      member1: '', member2: '', member3: '', member4: ''
    });
    setIsModalOpen(true);
  };

  // 2. Open Modal for Edit
  const handleOpenEdit = (group: Group, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent clicking the card link
    e.stopPropagation(); // Stop event bubbling
    setEditingGroup(group);
    setFormData({
      name: group.name,
      title: group.title,
      section: group.section,
      adviser: group.adviser,
      defenseDate: group.defenseDate,
      defenseTime: group.defenseTime,
      member1: group.members[0] || '',
      member2: group.members[1] || '',
      member3: group.members[2] || '',
      member4: group.members[3] || '',
    });
    setIsModalOpen(true);
  };

  // 3. Delete Group
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if(!confirm("Are you sure you want to delete this group?")) return;
    
    try {
      await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      setGroups(prev => prev.filter(g => g.id !== id));
    } catch (error) {
      console.error("Error deleting group", error);
    }
  };

  // 4. Save (Create or Update)
  const handleSave = async () => {
   const membersList = [formData.member1, formData.member2, formData.member3, formData.member4].filter(m => m.trim() !== "");
   
   const payload = {
     name: formData.name,
     title: formData.title,
     section: formData.section,
     adviser: formData.adviser,
     defenseDate: formData.defenseDate,
     defenseTime: formData.defenseTime,
     members: membersList
   };

   try {
     if (editingGroup) {
        // UPDATE
        await fetch(`/api/groups/${editingGroup.id}`, {
           method: 'PUT',
           body: JSON.stringify(payload)
        });
     } else {
        // CREATE
        await fetch('/api/groups', {
           method: 'POST',
           body: JSON.stringify(payload)
        });
     }
     
     // Reload to fetch fresh data
     window.location.reload(); 
   } catch (error) {
     console.error("Error saving group", error);
   }
};

  // Stats Logic
  const total = groups.length;
  const evaluated = groups.filter(g => g.status === 'Evaluated').length;
  const pending = total - evaluated;

  return (
    <div className="p-8 min-h-screen bg-slate-50 text-slate-800">
      
      {/* HEADER */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Panel Board</h1>
          <p className="text-slate-500">Manage evaluations and defense schedules.</p>
        </div>
        <button 
          onClick={handleOpenCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:shadow-blue-500/25 transition-all"
        >
          <Plus size={20} /> Register New Group
        </button>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total Groups" value={total} icon={<Users className="text-blue-500" />} />
        <StatCard label="Evaluated" value={evaluated} icon={<CheckCircle2 className="text-green-500" />} />
        <StatCard label="Pending" value={pending} icon={<Clock className="text-amber-500" />} />
      </div>

      {/* TOOLBAR */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          {['All', 'Pending', 'Evaluated'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                filter === f ? 'bg-slate-900 text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search group..." 
            className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {groups
          .filter(g => (filter === 'All' || g.status === filter) && g.name.toLowerCase().includes(search.toLowerCase()))
          .map((group) => (
          <Link href={`/panel-board/${group.id}`} key={group.id} className="group block">
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative h-full flex flex-col">
              
              {/* TOP ACTIONS (Edit/Delete) */}
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button 
                  onClick={(e) => handleOpenEdit(group, e)}
                  className="p-1.5 bg-slate-100 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors"
                  title="Edit Group"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={(e) => handleDelete(group.id, e)}
                  className="p-1.5 bg-slate-100 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                  title="Delete Group"
                >
                  <Trash2 size={16} />
                </button>
              </div>

              {/* STATUS */}
              <div className="flex justify-between items-start mb-4">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  group.status === 'Evaluated' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {group.status}
                </span>
                <span className="text-slate-400 text-xs font-bold bg-slate-100 px-2 py-1 rounded-md">
                  {group.section}
                </span>
              </div>

              <div className="flex-1 mb-4">
                <h3 className="font-bold text-xl text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                  {group.name}
                </h3>
                <p className="text-xs text-slate-500 line-clamp-2 h-8 leading-relaxed mb-3">
                  {group.title}
                </p>
               <div className="flex flex-wrap gap-1">
                {group.members.map((m, i) => (
                    <span key={`${m}-${i}`} className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-medium">
                    {m}
                    </span>
                ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <Calendar size={14} />
                  <span className="font-semibold">
                     {group.defenseDate ? new Date(group.defenseDate).toLocaleDateString(undefined, {month:'short', day:'numeric'}) : 'TBD'} • {group.defenseTime || '--:--'}
                  </span>
                </div>
                {group.hasManuscript && <FileText size={14} className="text-blue-500" />}
              </div>

            </div>
          </Link>
        ))}
      </div>

      {/* --- MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black text-slate-800">
                {editingGroup ? 'Edit Group Details' : 'Register New Group'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={24} className="text-slate-400" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Row 1: Name & Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InputGroup label="Group Name" value={formData.name} onChange={v => setFormData({...formData, name: v})} placeholder="e.g. ByteMe" />
                <InputGroup label="Section" value={formData.section} onChange={v => setFormData({...formData, section: v})} placeholder="e.g. TN31" />
              </div>
              
              <InputGroup label="Thesis Title" value={formData.title} onChange={v => setFormData({...formData, title: v})} placeholder="Full thesis title..." />

              {/* Row 2: Adviser & Schedule */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InputGroup label="Adviser" value={formData.adviser} onChange={v => setFormData({...formData, adviser: v})} placeholder="Adviser Name" />
                <InputGroup label="Defense Date" type="date" value={formData.defenseDate} onChange={v => setFormData({...formData, defenseDate: v})} />
                <InputGroup label="Time" type="time" value={formData.defenseTime} onChange={v => setFormData({...formData, defenseTime: v})} />
              </div>

              {/* Row 3: Members */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Team Members</label>
                <div className="grid grid-cols-2 gap-3">
                  <input className="input-field" placeholder="Member 1" value={formData.member1} onChange={e => setFormData({...formData, member1: e.target.value})} />
                  <input className="input-field" placeholder="Member 2" value={formData.member2} onChange={e => setFormData({...formData, member2: e.target.value})} />
                  <input className="input-field" placeholder="Member 3" value={formData.member3} onChange={e => setFormData({...formData, member3: e.target.value})} />
                  <input className="input-field" placeholder="Member 4" value={formData.member4} onChange={e => setFormData({...formData, member4: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t border-slate-100 justify-end">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all">
                {editingGroup ? 'Save Changes' : 'Register Group'}
              </button>
            </div>

          </div>
        </div>
      )}

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e2e8f0;
          font-size: 0.875rem;
          outline: none;
          transition: all;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
        }
      `}</style>
    </div>
  );
}

// --- HELPER COMPONENTS ---

function StatCard({ label, value, icon }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
       <div className="p-3 bg-slate-50 rounded-xl">{icon}</div>
       <div>
         <p className="text-2xl font-black text-slate-800">{value}</p>
         <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
       </div>
    </div>
  );
}

// 🟢 THIS INTERFACE FIXES YOUR ERROR
interface InputGroupProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}

function InputGroup({ label, value, onChange, placeholder, type = "text" }: InputGroupProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</label>
      <input 
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
      />
    </div>
  );
}