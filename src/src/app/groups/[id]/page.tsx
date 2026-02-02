import { dbConnect } from "@/lib/db";
import Group from "@/models/Group";
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
  Trophy,
  Presentation,
  MessageSquareQuote
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

  // --- DATA FIXES (Mapping DB fields to UI variables) ---
  // The DB likely stores these nested, so we unpack them here for safety.
  // @ts-ignore
  const seAdviser = group.advisers?.seAdviser || group.se2Adviser || "";
  // @ts-ignore
  const pmAdviser = group.advisers?.pmAdviser || group.pmAdviser || "";
  // @ts-ignore
  const projectManager = group.projectManager || group.assignPM || "";
  
  // --- MOCK DEFENSE CALCULATIONS ---
  // @ts-ignore
  const grades = group.mockDefenseGrades || [];
  let presentationTotal = 0;
  let paperTotal = 0;
  
  grades.forEach((g: any) => {
    presentationTotal += (Number(g.presentationScore) || 0);
    paperTotal += (Number(g.paperScore) || 0);
  });

  // Calculate averages if there are grades, otherwise 0
  const avgPresentation = grades.length ? (presentationTotal / grades.length).toFixed(1) : "0.0";
  const avgPaper = grades.length ? (paperTotal / grades.length).toFixed(1) : "0.0";
  
  // Total Score (Simple Average of the two components for display)
  const totalScore = grades.length 
    ? ((Number(avgPresentation) + Number(avgPaper)) / 2).toFixed(1)
    : "0.0";


  // --- PROGRESS LOGIC ---
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

  // Calculate Leaderboard Score
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
           {/* @ts-ignore */}
           {group.sections && group.sections.length > 0 ? (
             // @ts-ignore
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
          {/* @ts-ignore */}
          {group.groupName}
        </h1>
        <p className="text-xl md:text-2xl text-slate-400 italic font-medium leading-relaxed max-w-4xl">
          {/* @ts-ignore */}
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
              {/* @ts-ignore */}
              {group.members.map((m: string, i: number) => (
                <div key={i} className="px-5 py-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-700 flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-slate-300 flex-shrink-0"></div>
                  <span className="truncate">{m || "Empty Slot"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* DELIVERABLES LIST */}
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
          
          {/* 1. SCORE CARD */}
          <div className="bg-slate-900 p-8 rounded-[32px] text-white shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Progress Score</span>
                <Trophy size={16} className="text-yellow-500" />
              </div>
              <div className="flex items-end gap-2">
                <span className="text-7xl font-black text-white tracking-tighter">
                  {progressScore}
                </span>
                <span className="text-2xl font-bold text-slate-500 mb-2">%</span>
              </div>
              
              <div className="w-full h-2 bg-slate-800 rounded-full mt-6 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${progressScore}%` }}
                ></div>
              </div>
            </div>
            
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600 rounded-full blur-[80px] opacity-20 group-hover:opacity-30 transition-opacity"></div>
            <div className="absolute bottom-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
          </div>

          {/* 2. ADVISERS CARD */}
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
                  {seAdviser || <span className="text-slate-300 italic font-normal">TBA</span>}
                </p>
              </div>
              
              <div className="w-full h-px bg-slate-100"></div>
              
              <div className="group">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">
                  Project Adviser (PM)
                </span>
                <p className="text-base font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                  {pmAdviser || <span className="text-slate-300 italic font-normal">TBA</span>}
                </p>
              </div>
            </div>
          </div>

          {/* 3. PROJECT MANAGER CARD */}
          <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
               <Crown className="text-amber-500" size={24} />
               <span className="text-xs font-black uppercase text-amber-600 tracking-widest">Project Manager</span>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {projectManager || <span className="text-amber-300 italic">Not Assigned</span>}
            </p>
          </div>

          {/* 4. NEW: MOCK DEFENSE GRADE CARD */}
          <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                    <Presentation size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800">Mock Defense</h3>
                </div>
                {/* Total Average Score */}
                <div className="px-3 py-1 bg-slate-900 text-white rounded-lg text-sm font-bold">
                  {totalScore}
                </div>
             </div>

             {/* Score Breakdown */}
             <div className="grid grid-cols-2 gap-4 mb-6">
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Presentation</span>
                  <span className="text-xl font-bold text-slate-800">{avgPresentation}</span>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">Paper</span>
                  <span className="text-xl font-bold text-slate-800">{avgPaper}</span>
               </div>
             </div>

             {/* Comments Section */}
             <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Panelist Comments</h4>
                
                {grades.length === 0 ? (
                  <p className="text-sm text-slate-300 italic text-center py-4">No grades submitted yet.</p>
                ) : (
                  grades.map((grade: any, i: number) => (
                    <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 relative">
                       <MessageSquareQuote size={16} className="text-slate-300 absolute top-4 right-4" />
                       <p className="text-sm text-slate-600 italic leading-relaxed mb-2">
                         "{grade.comment || "No comment provided."}"
                       </p>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">
                         — {grade.panelistName || "Panelist"}
                       </div>
                    </div>
                  ))
                )}
             </div>
          </div>

        </div>
      </div>
    </div>
  );
}