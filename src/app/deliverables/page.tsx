'use client'

import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { getTasks, createTask, deleteTask, updateTask } from '@/app/actions';

// --- TYPES ---
interface Task {
  id: string;
  name: string;
  deadline: string;
  type: 'Internal Deadline' | 'Course Deadline' | 'Others';
}

// --- HELPER COMPONENTS ---

// 1. Task Card Component
interface TaskCardProps {
  task: Task;
  isOverdue: boolean;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
}

function TaskCard({ task, isOverdue, onDelete, onEdit }: TaskCardProps) {
  const isToday = task.deadline === new Date().toISOString().split('T')[0];

  let Icon = CheckCircle2;
  let iconColor = "text-slate-400";
  let borderColor = "border-slate-100";
  let containerBg = "bg-white";

  if (isOverdue) {
    Icon = AlertCircle;
    iconColor = "text-red-500";
    borderColor = "border-red-200";
    containerBg = "bg-red-50/30"; 
  } else if (isToday) {
    Icon = Clock; 
    iconColor = "text-green-600"; 
    borderColor = "border-green-200";
  } else {
    iconColor = "text-blue-500";
  }

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'Course Deadline': return 'bg-orange-100 text-orange-700';
      case 'Internal Deadline': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className={`group relative flex items-start p-5 mb-4 rounded-xl border ${borderColor} ${containerBg} shadow-sm hover:shadow-md transition-all`}>
      <div className={`mr-4 mt-1 p-2 rounded-lg ${isOverdue ? 'bg-red-100' : isToday ? 'bg-green-100' : 'bg-blue-50'}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>

      <div className="flex-1">
        <div className="flex justify-between items-start mb-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${getBadgeColor(task.type)}`}>
            {task.type}
          </span>
          
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(task)} 
              className="text-slate-400 hover:text-blue-600 text-xs font-medium"
            >
              Edit
            </button>
            <button 
              onClick={() => onDelete(task.id)}
              className="text-slate-400 hover:text-red-500 text-xs font-medium"
            >
              Delete
            </button>
          </div>
        </div>

        <h3 className={`text-base font-semibold ${isOverdue ? 'text-slate-600' : 'text-slate-800'}`}>
          {task.name}
        </h3>

        <div className="flex items-center mt-2 text-sm text-slate-500">
           <CalendarIcon className="w-3.5 h-3.5 mr-1.5" />
           <span className={isOverdue ? "text-red-500 font-medium" : isToday ? "text-green-600 font-bold" : ""}>
             {task.deadline} {isToday && "(Today)"} {isOverdue && "(Overdue)"}
           </span>
        </div>
      </div>
    </div>
  );
}

// 2. Dynamic Calendar Widget
interface CalendarWidgetProps {
  tasks: Task[];
}

function CalendarWidget({ tasks }: CalendarWidgetProps) {
  // State for the currently viewed month
  const [viewDate, setViewDate] = useState(new Date());
  
  // Real "Today" for highlighting
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Handlers for month switching
  const prevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };
  const nextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Calendar Math
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();
  
  // Get first day of month (0 = Sunday, 1 = Monday...)
  const firstDayOfMonth = new Date(year, viewDate.getMonth(), 1).getDay();
  // Get days in month (0th day of next month is last day of current)
  const daysInMonth = new Date(year, viewDate.getMonth() + 1, 0).getDate();

  // Generate calendar grid array
  // We need empty slots for days before the 1st
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const totalSlots = [...blanks, ...days];

  // Helper to format date string for comparison YYYY-MM-DD
  const getDateString = (day: number) => {
    const m = String(viewDate.getMonth() + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Helper to get dot color
  const getDotColor = (type: string) => {
    switch (type) {
      case 'Course Deadline': return 'bg-orange-500';
      case 'Internal Deadline': return 'bg-indigo-500';
      default: return 'bg-slate-400';
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-lg text-slate-800">{monthName} {year}</h2>
        </div>
        <div className="flex gap-1">
          <button onClick={prevMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ChevronLeft size={20} />
          </button>
          <button onClick={nextMonth} className="p-1 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      
      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm mb-2">
        {['S','M','T','W','T','F','S'].map((d, i) => ( 
           <div key={i} className="text-slate-400 text-xs font-bold py-1">{d}</div> 
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center text-sm">
        {totalSlots.map((d, index) => {
          if (d === null) return <div key={`empty-${index}`} />;

          const dateStr = getDateString(d);
          const isToday = dateStr === todayStr;
          
          // Find tasks for this specific day
          const dayTasks = tasks.filter(t => t.deadline === dateStr);
          const hasTasks = dayTasks.length > 0;
          

          return (
            <div key={d} className="relative group">
              <div 
                className={`
                  h-9 w-9 mx-auto flex flex-col items-center justify-center rounded-full text-xs font-medium cursor-default transition-all relative
                  ${isToday 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110 font-bold z-10' 
                    : 'text-slate-600 hover:bg-slate-50'}
                  ${hasTasks && !isToday ? 'font-bold text-slate-800' : ''}
                `}
              >
                {d}
                
                {/* Dots Indicator */}
                {hasTasks && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayTasks.slice(0, 3).map((t, i) => (
                      <div key={i} className={`w-1 h-1 rounded-full ${isToday ? 'bg-white' : getDotColor(t.type)}`} />
                    ))}
                  </div>
                )}
              </div>

              {/* Hover Tooltip */}
              {hasTasks && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 flex flex-col gap-1">
                  <div className="font-bold border-b border-slate-600 pb-1 mb-1 text-xs">{monthName} {d}</div>
                  {dayTasks.map(t => (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(t.type)}`}></div>
                      <span className="truncate">{t.name}</span>
                    </div>
                  ))}
                  {/* Triangle Pointer */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-4 text-[10px] font-medium text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Internal
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500"></span> Course
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-400"></span> Others
        </div>
      </div>
    </div>
  );
}

// --- MAIN PAGE COMPONENT ---

export default function DeliverablesPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState({ name: false, deadline: false });
  const [isShaking, setIsShaking] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    deadline: '',
    type: 'Course Deadline'
  });

  // Load Tasks
  useEffect(() => {
    async function load() {
      const data = await getTasks();
      setTasks(data as any);
    }
    load();
  }, []);

  // Helper to Reset Form on Close
  const handleCloseModal = () => {
  setIsModalOpen(false);
  setEditingId(null);
  setFormData({ name: '', deadline: '', type: 'Course Deadline' });
  
  // --- ADD THIS LINE ---
    setErrors({ name: false, deadline: false });
    };
  const handleSave = async () => {
  const newErrors = {
    name: !formData.name.trim(),
    deadline: !formData.deadline
  };

  if (newErrors.name || newErrors.deadline) {
    setErrors(newErrors);
    setIsShaking(true);
    
    setTimeout(() => setIsShaking(false), 500);
    return;
  }

  setIsLoading(true);
  

    try {
      if (editingId) {
        const result = await updateTask(editingId, formData);
        if (result.success) {
          setTasks(prev => prev.map(t => 
            t.id === editingId ? { ...t, ...formData, type: formData.type as any } : t
          ));
        }
      } else {
        const result = await createTask(formData);
        if (result.success) {
          setTasks(prev => [{ 
            id: result.newId, 
            name: formData.name, 
            deadline: formData.deadline, 
            type: formData.type as any 
          }, ...prev]);
        }
      }
      handleCloseModal();
    } catch (error) {
      console.error("Failed to save:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Delete this task?")) return;
    const result = await deleteTask(id);
    if (result.success) {
      setTasks(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleEdit = (task: Task) => {
    setEditingId(task.id);
    setFormData({
      name: task.name,
      deadline: task.deadline,
      type: task.type
    });
    setIsModalOpen(true);
  };

  // --- SORTING & GROUPING ---
  const todayStr = new Date().toISOString().split('T')[0];

  const upcomingTasks = tasks.filter(t => t.deadline >= todayStr);
  const overdueTasks = tasks.filter(t => t.deadline < todayStr);

  upcomingTasks.sort((a, b) => a.deadline.localeCompare(b.deadline));
  overdueTasks.sort((a, b) => b.deadline.localeCompare(a.deadline));
  // Add this inside the component function, before return
    const shakeAnimation = isShaking ? "animate-[shake_0.5s_ease-in-out]" : "";

    // And ensure you have this keyframe defined in your global CSS or tailwind config:
    /* @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-4px); }
        75% { transform: translateX(4px); }
    }
    */

  return (
    <div className="min-h-screen bg-slate-50/50 p-8 font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Deliverables</h1>
          <p className="text-slate-500 mt-2">Manage course requirements and internal tasks.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-blue-200 transition-all active:scale-95"
        >
          <Plus size={18} />
          New Task
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Active Tasks */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-xl font-bold text-slate-800">Upcoming & Active</h2>
            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">
              {upcomingTasks.length}
            </span>
          </div>

          {upcomingTasks.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
              <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="text-slate-300" />
              </div>
              <p className="text-slate-500">No upcoming tasks! You're all caught up.</p>
            </div>
          ) : (
            upcomingTasks.map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isOverdue={false} 
                onDelete={handleDelete}
                onEdit={handleEdit}
              />
            ))
          )}
        </div>

        {/* RIGHT COLUMN: Calendar + Overdue */}
        <div className="lg:col-span-1 space-y-8">
          
          {/* PASSED TASKS PROP HERE FOR DYNAMIC CALENDAR */}
          <CalendarWidget tasks={tasks} />

          {overdueTasks.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-red-900">Previous Deadlines</h3>
              </div>
              
              <div className="space-y-3">
                {overdueTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    isOverdue={true} 
                    onDelete={handleDelete}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      {/* --- ADD/EDIT TASK MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-800">
                  {editingId ? 'Edit Task' : 'Add New Task'}
                </h3>
                <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600">✕</button>
              </div>

              <div className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Task Name <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="text" 
                        placeholder="e.g. Chapter 1 Revisions"
                        // Updated className with conditional logic
                        className={`w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all 
                        ${errors.name 
                            ? `border-red-400 focus:ring-red-200 ${shakeAnimation}` 
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        value={formData.name}
                        onChange={(e) => {
                        setFormData({...formData, name: e.target.value});
                        if(errors.name) setErrors({...errors, name: false}); // Clear error on type
                        }}
                    />
                    {/* Error Text */}
                    {errors.name && <p className="text-red-500 text-xs mt-1 font-medium">Task name is required</p>}
                    </div>

                   <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Deadline <span className="text-red-500">*</span>
                    </label>
                    <input 
                        type="date" 
                        // Updated className with conditional logic
                        className={`w-full p-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 transition-all 
                        ${errors.deadline 
                            ? `border-red-400 focus:ring-red-200 ${shakeAnimation}` 
                            : 'border-slate-200 focus:ring-blue-500'
                        }`}
                        value={formData.deadline}
                        onChange={(e) => {
                        setFormData({...formData, deadline: e.target.value});
                        if(errors.deadline) setErrors({...errors, deadline: false}); // Clear error on select
                        }}
                    />
                    {/* Error Text */}
                    {errors.deadline && <p className="text-red-500 text-xs mt-1 font-medium">Please select a date</p>}
                    </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Type</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                  >
                    <option>Course Deadline</option>
                    <option>Internal Deadline</option>
                    <option>Others</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-8">
                <button 
                  onClick={handleCloseModal}
                  className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isLoading}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : (editingId ? 'Update Task' : 'Create Task')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}