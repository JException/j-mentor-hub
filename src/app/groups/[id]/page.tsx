import { dbConnect } from "@/lib/db";
import { Group } from "@/models/Group";
import Task from "@/models/Task";
import Progress from "@/models/Progress";
import { notFound } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Users, 
  Crown, 
  GraduationCap, 
  CheckCircle2, 
  Circle, 
  Clock, 
  Tag,
  Trophy
} from 'lucide-react';

export default async function GroupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await dbConnect();
  
  // 1. Fetch Group, All Tasks, and This Group's Progress in parallel
  const [group, allTasks, groupProgress] = await Promise.all([
    Group.findById(id).lean(),
    Task.find({}).sort({ deadline: 1 }).lean(), // Get all curriculum tasks
    Progress.find({ groupId: id }).lean()       // Get status for this specific group
  ]);

  if (!group) {
    return notFound();
  }

  // 2. Data Processing: Merge Tasks with Progress Status
  // Create a fast lookup map: { "taskId123": "Completed" }
  const progressMap = new Map(
    groupProgress.map((p: any) => [p.taskId.toString(), p.status])
  );

  const taskList = allTasks.map((task: any) => {
    const status = progressMap.get(task._id.toString()) || "Pending";
    const isCompleted = status === "Done" || status === "Completed" || status === "Approved";
    
    return {
      ...task,
      status,
      isCompleted,
      // Helper to format date cleanly
      formattedDate: new Date(task.deadline).toLocaleDateString('en-US', { 
        month: 'short', day: 'numeric', year: 'numeric' 
      })
    };
  });

  // 3. Calculate Score (Leaderboard Logic)
  const totalTasks = taskList.length;
  const completedTasks = taskList.filter((t) => t.isCompleted).length;
  const progressScore = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 pb-24">
      <Link href="/groups" className="flex items-center gap-2 text-slate-400 hover:text-blue-600 transition-all font-bold text-xs uppercase tracking-widest w-fit">
        <ArrowLeft size={16} /> Back to Groups
      </Link>

      {/* HEADER: Title, Thesis, Tags */}
      <header className="border-b border-slate-100 pb-8">
        <div className="flex flex-wrap gap-2 mb-4">
           {/* Section Tags */}
           {group.sections && group.sections.length > 0 ? (
             group.sections.map((sec: string, i: number) => (
               <span key={i} className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border border-indigo-100">
                 <Tag size={10} /> {sec}
               </span>
             ))
           ) : (
             <span className="text-slate-300 text-[10px] font-bold uppercase tracking-wide">No Section</span>
           )}
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight mb-3">
          {group.groupName}
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 italic font-medium leading-relaxed max-w-4xl">
          "{group.thesisTitle}"
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN (2/3 width) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* MEMBERS CARD */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-3 text-lg font-bold mb-6 text-slate-800">
              <Users className="text-blue-500" size={20} /> Team Members
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {group.members.map((m: string, i: number) => (
                <div key={i} className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-slate-300 flex-shrink-0"></div>
                  <span className="truncate">{m || "Empty Slot"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DELIVERABLES LIST (The "Better UI" Implementation) */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="flex items-center gap-3 text-lg font-bold text-slate-800">
                <Clock className="text-blue-500" size={20} /> Deliverables Status
              </h3>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                {completedTasks}/{totalTasks} Completed
              </span>
            </div>
            
            <div className="space-y-3">
              {taskList.length === 0 ? (
                <div className="text-center py-10 text-slate-400 italic">No deliverables assigned yet.</div>
              ) : (
                taskList.map((task: any) => (
                  <div 
                    key={task._id} 
                    className={`group flex items-start justify-between p-5 rounded-2xl border transition-all duration-200 ${
                      task.isCompleted 
                        ? 'bg-emerald-50/50 border-emerald-100' 
                        : 'bg-white border-slate-100 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* FIX: flex-shrink-0 prevents icon from squishing */}
                      <div className={`mt-0.5 flex-shrink-0 ${task.isCompleted ? 'text-emerald-500' : 'text-slate-300'}`}>
                        {task.isCompleted ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                      </div>
                      
                      <div className="space-y-1">
                        <p className={`font-bold text-sm md:text-base ${
                          task.isCompleted ? 'text-emerald-900 line-through decoration-emerald-900/30' : 'text-slate-800'
                        }`}>
                          {task.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          <span>{task.type}</span>
                          <span>•</span>
                          <span>Due: {task.formattedDate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className={`hidden sm:flex flex-shrink-0 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ml-4 items-center ${
                      task.isCompleted 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {task.status}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (1/3 width) - Stats & Advisers */}
        <div className="space-y-6">
          
          {/* SCORE CARD */}
          <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Leaderboard Score</span>
                <Trophy size={16} className="text-yellow-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-7xl font-black text-white tracking-tighter">
                  {progressScore}
                </span>
                <span className="text-2xl font-bold text-slate-500 mb-2">%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${progressScore}%` }}
                ></div>
              </div>
            </div>
            
            {/* Background Decoration */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          </div>

          {/* ADVISERS CARD */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                 <GraduationCap size={20} />
              </div>
              <h3 className="font-bold text-slate-800">Advisers</h3>
            </div>
            
            <div className="space-y-6">
              <div className="group">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Technical Adviser (SE2)
                </span>
                <p className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {group.se2Adviser || <span className="text-slate-300 italic font-normal">TBA</span>}
                </p>
              </div>
              
              <div className="w-full h-px bg-slate-100"></div>
              
              <div className="group">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Project Adviser (PM)
                </span>
                <p className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {group.pmAdviser || <span className="text-slate-300 italic font-normal">TBA</span>}
                </p>
              </div>
            </div>
          </div>

          {/* PROJECT MANAGER CARD */}
          <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
               <Crown className="text-amber-500" size={24} />
               <span className="text-[10px] font-black uppercase text-amber-600 tracking-widest">Project Manager</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {group.assignPM || <span className="text-amber-300 italic">Not Assigned</span>}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}