"use client";
import React, { useState, useEffect } from 'react';
// Changed PushPin to Pin as PushPin does not exist in lucide-react
import { Save, Trash2, Pin, Edit3, X, Users, Crown } from 'lucide-react'; 
import { saveGroupToDB, getGroupsFromDB, deleteGroup, updateGroup, togglePinGroup } from "@/app/actions";
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const [sortBy, setSortBy] = useState<'newest' | 'alphabetical' | 'group'>('newest');

  // FORM STATE
  const [formData, setFormData] = useState({
    groupName: '', 
    thesisTitle: '', 
    members: ['', '', '', ''], 
    assignPM: ''
  });

  // DATA LOADING
  const loadData = async () => {
    const data = await getGroupsFromDB();
    setGroups(data || []);
  };

  useEffect(() => {
    loadData();
  }, []); 

  // PIN TOGGLE
  const handleTogglePin = async (id: string, status: boolean) => {
    const result = await togglePinGroup(id, status);
        if (result.success) {
          await loadData(); // This is critical to see the change!
        }
    try {
      await togglePinGroup(id, status);
      await loadData(); // Refresh list after database update
    } catch (error) {
      console.error("Pin Error:", error);
    }
  };

  // SORTING LOGIC
  const sortedGroups = [...groups].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;

    if (sortBy === 'alphabetical') return a.thesisTitle.localeCompare(b.thesisTitle);
    if (sortBy === 'group') return a.groupName.localeCompare(b.groupName);
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      try {
        const res = await deleteGroup(id);
        if (res.success) await loadData();
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  const handleEdit = (g: any) => {
    setIsEditing(g._id);
    setFormData({
      groupName: g.groupName,
      thesisTitle: g.thesisTitle,
      members: Array.isArray(g.members) 
        ? [...g.members, "", "", "", ""].slice(0, 4) 
        : ['', '', '', ''],
      assignPM: g.assignPM || ''
    });

    const element = document.getElementById('form-top');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const saveGroup = async () => {
    if (!formData.groupName || !formData.thesisTitle) {
      alert("Please fill in Group Name and Thesis Title");
      return;
    }

    setIsSaving(true);
    const dataToSave = {
      ...formData,
      members: formData.members.filter(m => m.trim() !== ""),
      createdAt: isEditing ? undefined : new Date().toISOString() // Tracking for 'Newest' sort
    };

    try {
      let result = isEditing 
        ? await updateGroup(isEditing, dataToSave) 
        : await saveGroupToDB(dataToSave);

      if (result.success) {
        await loadData();
        setFormData({ groupName: '', thesisTitle: '', members: ['', '', '', ''], assignPM: '' });
        setIsEditing(null);
      }
    } catch (error) {
      console.error("Save Error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const updateMember = (index: number, value: string) => {
    const newMembers = [...formData.members];
    newMembers[index] = value;
    setFormData({ ...formData, members: newMembers });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 p-6 pb-20">
      <header className="px-2">
        <h1 className="text-6xl font-medium tracking-tight text-slate-800">
          Thesis <span className="text-slate-300 italic">Groups</span>
        </h1>
        <p className="text-slate-500 mt-2 font-medium">Manage active mentoring groups and thesis titles.</p>
      </header>

      {/* FORM SECTION */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 space-y-8">
        <div className="flex justify-between items-center">
          <h2 id="form-top" className="text-2xl font-bold text-slate-800">
            {isEditing ? 'Update Group Details' : 'Register New Group'}
          </h2>
          {isEditing && (
            <button 
              onClick={() => {
                setIsEditing(null); 
                setFormData({groupName:'', thesisTitle:'', members:['','','',''], assignPM:''});
              }} 
              className="text-red-500 flex items-center gap-2 text-xs font-black uppercase tracking-widest hover:bg-red-50 p-2 rounded-xl transition-all"
            >
              <X size={14}/> Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Group Name</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:border-blue-500 transition-all font-bold"
              value={formData.groupName}
              onChange={e => setFormData({...formData, groupName: e.target.value})}
              placeholder="e.g. Group Alpha"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Thesis Title</label>
            <input 
              className="w-full bg-slate-50 border border-slate-100 p-5 rounded-3xl outline-none focus:border-blue-500 transition-all font-medium italic"
              value={formData.thesisTitle}
              onChange={e => setFormData({...formData, thesisTitle: e.target.value})}
              placeholder="Thesis Title"
            />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Team Members</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {formData.members.map((m, i) => (
              <input 
                key={i}
                className="bg-slate-50 border border-slate-100 p-4 rounded-2xl outline-none focus:border-blue-300 transition-all text-sm font-semibold"
                value={m}
                onChange={e => updateMember(i, e.target.value)}
                placeholder={`Member ${i + 1}`}
              />
            ))}
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 border-t border-slate-50 pt-8">
          <div className="flex items-center gap-4">
            <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl"><Crown size={20} /></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Manager</span>
              <select 
                className="bg-transparent font-bold text-sm outline-none cursor-pointer" 
                value={formData.assignPM} 
                onChange={e => setFormData({...formData, assignPM: e.target.value})}
              >
                <option value="">Select from members</option>
                {formData.members.filter(m => m.trim() !== "").map((m, i) => (
                  <option key={i} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <button 
            onClick={saveGroup} 
            disabled={isSaving}
            className="w-full md:w-auto bg-slate-900 hover:bg-blue-600 text-white px-10 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all disabled:opacity-50"
          >
            {isSaving ? 'Processing...' : (isEditing ? 'Update Record' : 'Register Group')}
          </button>
        </div>
      </section>

      {/* SORTING CONTROLS */}
      <div className="flex justify-end px-2">
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value as any)}
          className="bg-white border border-slate-200 px-6 py-3 rounded-2xl font-bold text-xs outline-none shadow-sm cursor-pointer hover:border-blue-300 transition-all"
        >
          <option value="newest">Sort by: Newest</option>
          <option value="alphabetical">Sort by: Title (A-Z)</option>
          <option value="group">Sort by: Group Name</option>
        </select>
      </div>

      {/* GROUPS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedGroups.map((group) => (
          <div 
            key={group._id} 
            onClick={() => router.push(`/groups/${group._id}`)}
            className={`bg-white p-8 rounded-[40px] border shadow-sm transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between group/card
                      hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] hover:-translate-y-2 
                      ${group.isPinned ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 hover:border-blue-400'}`}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg
                                transition-all duration-300 group-hover/card:bg-blue-600 group-hover/card:scale-110 group-hover/card:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                  {group.groupName?.substring(0, 2).toUpperCase()}
                </div>
                
                <div className="flex gap-2 relative z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleTogglePin(group._id, group.isPinned); }}
                    className={`p-3 rounded-xl transition-all ${group.isPinned ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-slate-50 text-slate-300 hover:text-amber-600 hover:bg-amber-50'}`}
                    title={group.isPinned ? "Unpin" : "Pin to top"}
                  >
                    <Pin size={18} className={group.isPinned ? "fill-current" : "-rotate-45"} />
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleEdit(group); }} 
                    className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit3 size={18}/>
                  </button>

                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(group._id); }} 
                    className="p-3 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18}/>
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover/card:text-blue-600 transition-colors">
                {group.groupName}
              </h3>
              
              <p className="text-slate-500 text-sm italic line-clamp-2 border-l-2 border-slate-100 pl-3 mb-6 group-hover/card:border-blue-200">
                "{group.thesisTitle}"
              </p>

              <div className="flex flex-wrap gap-2">
                {group.members.map((m: any, i: number) => (
                  <span key={i} className={`text-[10px] px-3 py-1.5 rounded-full font-bold uppercase tracking-tight border transition-all ${
                    m === group.assignPM 
                    ? "bg-amber-50 text-amber-600 border-amber-200 group-hover/card:bg-amber-100" 
                    : "bg-slate-50 text-slate-400 border-slate-100"
                  }`}>
                    {m === group.assignPM && "👑 "}{m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
