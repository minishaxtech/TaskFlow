// src/pages/Dashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { Link }     from 'react-router-dom';
import { format, isPast } from 'date-fns';
import { AlertCircle, CheckCircle2, Clock, FolderOpen, ListTodo } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS = {
  HIGH:   'bg-red-100 text-red-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW:    'bg-green-100 text-green-700',
};
const STATUS_COLORS = {
  TODO:        'bg-slate-100 text-slate-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE:        'bg-green-100 text-green-700',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function TaskRow({ task }) {
  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'DONE';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project && (
            <Link to={`/projects/${task.project.id}`} className="text-xs text-brand-600 hover:underline">
              {task.project.name}
            </Link>
          )}
          {task.dueDate && (
            <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-slate-400'}`}>
              {overdue ? 'Overdue · ' : ''}{format(new Date(task.dueDate), 'MMM d')}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4 shrink-0">
        <span className={`badge ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</span>
        <span className={`badge ${STATUS_COLORS[task.status]}`}>
          {task.status.replace('_', ' ')}
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const { stats = {}, overdueTasks = [], myTasks = [] } = data || {};

  return (
    <div className="p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">
          Good {getGreeting()}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's what's happening across your projects.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-8">
        <StatCard icon={FolderOpen}   label="Projects"    value={stats.totalProjects ?? 0} color="bg-brand-100 text-brand-700" />
        <StatCard icon={ListTodo}     label="To do"       value={stats.todo         ?? 0} color="bg-slate-100 text-slate-600" />
        <StatCard icon={Clock}        label="In progress" value={stats.inProgress   ?? 0} color="bg-blue-100 text-blue-700"   />
        <StatCard icon={AlertCircle}  label="Overdue"     value={stats.overdue      ?? 0} color="bg-red-100 text-red-600"     />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* My open tasks */}
        <div className="card p-5">
          <h2 className="text-base font-medium text-slate-900 mb-3">Assigned to me</h2>
          {myTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="All caught up!" />
          ) : (
            myTasks.map(t => <TaskRow key={t.id} task={t} />)
          )}
        </div>

        {/* Overdue tasks */}
        <div className="card p-5">
          <h2 className="text-base font-medium text-slate-900 mb-3">
            Overdue
            {overdueTasks.length > 0 && (
              <span className="ml-2 badge bg-red-100 text-red-700">{overdueTasks.length}</span>
            )}
          </h2>
          {overdueTasks.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="No overdue tasks" />
          ) : (
            overdueTasks.map(t => <TaskRow key={t.id} task={t} />)
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="flex flex-col items-center py-8 text-slate-400 gap-2">
      <Icon className="h-8 w-8" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
