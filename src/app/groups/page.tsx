"use client";
import React, { useState, useEffect } from 'react';
import { Save, Trash2, Edit3, X, Users, Crown } from 'lucide-react'; 
import { saveGroupToDB, getGroupsFromDB, deleteGroup, updateGroup } from "@/app/actions";
import { useRouter } from 'next/navigation';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<any | null>(null);
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    groupName: '', 
    thesisTitle: '', 
    members: ['', '', '', ''], 
    assignPM: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const data = await getGroupsFromDB();
    setGroups(data);
  };
  const getSafeKey = (name: string) => name.replace(/\./g, ' ');
  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this group?")) {
      try {
        const res = await deleteGroup(id);
        if (res.success) {
          await loadData(); // Refresh the list after deleting
        } else {
          alert("Failed to delete group");
        }
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
      // Ensure we always have exactly 4 slots for the inputs, filling empty ones with ""
      members: Array.isArray(g.members) 
        ? [...g.members, "", "", "", ""].slice(0, 4) 
        : ['', '', '', ''],
      assignPM: g.assignPM || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveGroup = async () => {
    if (!formData.groupName || !formData.thesisTitle) {
        alert("Please fill in Group Name and Thesis Title");
        return;
    }

    setIsSaving(true);
    const dataToSave = {
      groupName: formData.groupName,
      thesisTitle: formData.thesisTitle,
      members: formData.members.filter(m => m.trim() !== ""),
      assignPM: formData.assignPM
    };

    try {
      let result;
      if (isEditing) {
        result = await updateGroup(isEditing, dataToSave);
      } else {
        result = await saveGroupToDB(dataToSave);
      }

      if (result.success) {
        await loadData();
        // Reset Form
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
        <p className="text-slate-500 mt-2 font-medium">Manage your active mentoring groups and thesis titles.</p>
      </header>

      {/* FORM SECTION */}
      <section className="bg-white rounded-[40px] border border-slate-200 shadow-xl p-10 space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">
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
              placeholder="e.g. AI-Powered Schedule Optimizer"
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
            <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl">
              <Crown size={20} />
            </div>
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

      {/* GROUPS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {groups.map((group) => (
    <div 
      key={group._id} 
      title="Click to view group details" // Adds a native tooltip on hover
      // ACTION: Added bright hover glow, lift effect, and cursor pointer
      className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm 
                 transition-all duration-300 ease-out cursor-pointer
                 hover:shadow-[0_20px_50px_rgba(59,130,246,0.15)] 
                 hover:-translate-y-2 hover:border-blue-400 group/card flex flex-col justify-between"
      // ACTION: Trigger the modal when the card is clicked
      onClick={() => router.push(`/groups/${group._id}`)}
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          {/* ACTION: Added bright blue transition and scaling on hover */}
          <div className="h-14 w-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-lg
                          transition-all duration-300 group-hover/card:bg-blue-600 group-hover/card:scale-110 group-hover/card:shadow-[0_0_20px_rgba(37,99,235,0.4)]">
            {group.groupName?.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex gap-2 relative z-10">
            <button 
              onClick={(e) => {
                e.stopPropagation(); // ACTION: Prevents the card's onClick (modal) from firing
                handleEdit(group);
              }} 
              className="p-3 bg-slate-50 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            >
              <Edit3 size={18}/>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation(); // ACTION: Prevents the card's onClick (modal) from firing
                handleDelete(group._id);
              }} 
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

  {/* VIEW & EDIT MODAL OVERLAY */}
{selectedGroup && (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
    <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white">
      
      {/* Dynamic Header */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 text-white relative">
        <button 
          onClick={() => setSelectedGroup(null)}
          className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all"
        >
          <X size={20} />
        </button>
        <span className="text-blue-100 text-[10px] font-black uppercase tracking-widest">Thesis Group Profile</span>
        <h2 className="text-3xl font-bold mt-1 leading-tight">{selectedGroup.groupName}</h2>
      </div>

      <div className="p-10 space-y-8">
        {/* Thesis Title Section */}
        <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
          <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Research Title</label>
          <p className="text-lg font-medium italic text-slate-700 mt-2">"{selectedGroup.thesisTitle}"</p>
        </div>

        <div className="grid grid-cols-2 gap-8">
          {/* Members List */}
          <div>
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-4">The Research Team</label>
            <div className="space-y-3">
              {selectedGroup.members.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-3 font-semibold text-slate-600">
                  <div className="h-2 w-2 rounded-full bg-blue-400" /> {m}
                </div>
              ))}
            </div>
          </div>
          
          {/* PM Highlight */}
          <div className="flex flex-col justify-center items-center bg-amber-50 rounded-3xl p-6 border border-amber-100 text-center">
             <div className="bg-amber-100 text-amber-600 p-3 rounded-2xl mb-3 shadow-sm">
                <Crown size={24} />
             </div>
             <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Project Manager</span>
             <span className="font-bold text-slate-800">{selectedGroup.assignPM || 'Unassigned'}</span>
          </div>
        </div>

        {/* Action Footer */}
        <div className="flex gap-4 pt-4">
          <button 
            onClick={() => {
              handleEdit(selectedGroup); // Triggers your existing edit logic
              setSelectedGroup(null);     // Closes the modal
            }}
            className="flex-1 bg-slate-900 hover:bg-blue-600 text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <Edit3 size={16}/> Edit Details
          </button>
          <button 
            onClick={() => setSelectedGroup(null)}
            className="px-8 bg-slate-100 hover:bg-slate-200 text-slate-500 py-4 rounded-2xl font-bold text-[11px] uppercase tracking-widest transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
)}
}