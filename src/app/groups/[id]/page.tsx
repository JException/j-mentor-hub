import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Crown } from 'lucide-react';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  // 1. You must await params in the latest Next.js versions
  const { id } = await params;

  await dbConnect();
  
  // 2. Fetch data
  const group = await Group.findById(id).lean();

  if (!group) {
    return notFound();
  }

  return (
    <div className="max-w-6xl mx-auto p-10 space-y-8">
      <Link href="/groups" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-bold text-xs uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to Groups
      </Link>

      <header className="border-b border-slate-100 pb-10">
        <h1 className="text-6xl font-bold text-slate-900 tracking-tight">{group.groupName}</h1>
        <p className="text-2xl text-slate-400 italic mt-4 max-w-3xl">"{group.thesisTitle}"</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 bg-white p-10 rounded-[40px] border border-slate-200 shadow-sm">
          <h3 className="flex items-center gap-3 text-xl font-bold mb-8">
            <Users className="text-blue-500" /> Team Members
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.members.map((m: string, i: number) => (
              <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 font-bold text-slate-700">
                {m}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 p-10 rounded-[40px] border border-amber-100 h-fit">
          <Crown className="text-amber-500 mb-4" size={40} />
          <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Project Manager</span>
          <p className="text-2xl font-bold text-slate-800 mt-2">{group.assignPM || "Not Assigned"}</p>
        </div>
      </div>
    </div>
  );
}