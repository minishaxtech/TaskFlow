// src/pages/Projects.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, CheckSquare, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../lib/api';

function CreateProjectModal({ onClose }) {
  const qc = useQueryClient();
  const [name, setName]           = useState('');
  const [description, setDesc]    = useState('');

  const mutation = useMutation({
    mutationFn: data => api.post('/projects', data).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      onClose();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create project'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="card w-full max-w-md p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">New project</h2>
        <div className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input" autoFocus placeholder="e.g. Q3 Launch"
              value={name} onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input resize-none" rows={3} placeholder="Optional"
              value={description} onChange={e => setDesc(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button
              onClick={() => mutation.mutate({ name, description })}
              disabled={!name.trim() || mutation.isPending}
              className="btn-primary"
            >
              {mutation.isPending ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const [showModal, setShowModal] = useState(false);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects').then(r => r.data.projects),
  });

  const deleteMutation = useMutation({
    mutationFn: id => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Delete failed'),
  });

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
          <p className="text-sm text-slate-500 mt-1">All projects you're a member of</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary">
          <Plus className="h-4 w-4" /> New project
        </button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      ) : data?.length === 0 ? (
        <div className="card flex flex-col items-center py-16 gap-3 text-slate-400">
          <FolderKanban className="h-12 w-12" />
          <p className="text-sm">No projects yet. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data?.map(project => (
            <div key={project.id} className="card p-5 hover:shadow-md transition-shadow group">
              <div className="flex items-start justify-between">
                <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
                  <h2 className="font-medium text-slate-900 truncate group-hover:text-brand-600 transition-colors">
                    {project.name}
                  </h2>
                  {project.description && (
                    <p className="mt-1 text-sm text-slate-500 line-clamp-2">{project.description}</p>
                  )}
                </Link>
                <button
                  onClick={() => {
                    if (confirm('Delete this project and all its tasks?')) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  className="ml-2 shrink-0 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <CheckSquare className="h-3.5 w-3.5" />
                  {project._count.tasks} task{project._count.tasks !== 1 ? 's' : ''}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {project._count.members} member{project._count.members !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <CreateProjectModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
