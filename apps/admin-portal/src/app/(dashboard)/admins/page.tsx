'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, UserPlus, Trash2, X, Loader2, Crown } from 'lucide-react';
import { adminsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin', ops_manager: 'Ops Manager', support: 'Support',
  finance: 'Finance', content: 'Content', analyst: 'Analyst',
};
const prettyPerm = (p: string) =>
  p === '*' ? 'Full access' : p.replace('.', ': ').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['admins'], queryFn: () => adminsApi.getAll() });
  const d = data?.data;
  const admins: any[] = d?.admins ?? [];
  const roles: string[] = d?.roles ?? Object.keys(ROLE_LABELS);
  const permissions: string[] = d?.permissions ?? [];
  const rolePresets: Record<string, string[]> = d?.rolePresets ?? {};
  const meId: string = d?.meId;
  const [modal, setModal] = useState<null | { mode: 'create' | 'edit'; admin?: any }>(null);
  const invalidate = () => qc.invalidateQueries({ queryKey: ['admins'] });

  const remove = useMutation({
    mutationFn: (id: string) => adminsApi.remove(id),
    onSuccess: () => { toast.success('Admin removed'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to remove'),
  });

  if (isLoading) return <div className="p-8 text-[#7a8fa6]">Loading admins…</div>;
  if (error || !d) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[#f5f0e8]">Admins</h1>
        <div className="glass-card rounded-xl p-10 text-center">
          <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-[#c9a84c]" />
          <p className="text-[#f5f0e8]">Only a super admin can manage admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#f5f0e8] flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-[#c9a84c]" /> Admins</h1>
          <p className="text-[#7a8fa6] mt-1">Create admins and scope their access to their role. Only super admins can manage this.</p>
        </div>
        <Button onClick={() => setModal({ mode: 'create' })} className="gap-2"><UserPlus className="w-4 h-4" /> Add admin</Button>
      </div>

      <div className="space-y-3">
        {admins.map((a) => (
          <div key={a.id} className="glass-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[#f5f0e8] flex items-center gap-1.5">
                  {a.name}
                  {a.role === 'super_admin' && <Crown className="w-3.5 h-3.5 text-[#c9a84c]" />}
                  {a.id === meId && <span className="text-[11px] text-[#7a8fa6]">(you)</span>}
                </p>
                <p className="text-[13px] text-[#7a8fa6]">{a.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[11px] rounded-full bg-[rgba(201,168,76,0.18)] text-[#c9a84c] px-2 py-0.5">{ROLE_LABELS[a.role] || a.role}</span>
                  {(a.permissions ?? []).slice(0, 8).map((p: string) => (
                    <span key={p} className="text-[11px] rounded-full bg-[rgba(255,255,255,0.06)] text-[#cdd8e6] px-2 py-0.5">{prettyPerm(p)}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => setModal({ mode: 'edit', admin: a })}>Edit</Button>
                {a.id !== meId && (
                  <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-500/10"
                    onClick={() => { if (confirm(`Remove ${a.name}?`)) remove.mutate(a.id); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <AdminModal mode={modal.mode} admin={modal.admin} roles={roles} permissions={permissions} rolePresets={rolePresets}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); invalidate(); }} />
      )}
    </div>
  );
}

function AdminModal({ mode, admin, roles, permissions, rolePresets, onClose, onSaved }: {
  mode: 'create' | 'edit'; admin?: any; roles: string[]; permissions: string[]; rolePresets: Record<string, string[]>;
  onClose: () => void; onSaved: () => void;
}) {
  const [email, setEmail] = useState(admin?.email ?? '');
  const [name, setName] = useState(admin?.name ?? '');
  const [role, setRole] = useState<string>(admin?.role ?? 'support');
  const [perms, setPerms] = useState<string[]>(admin?.permissions?.filter((p: string) => p !== '*') ?? rolePresets['support'] ?? []);
  const [password, setPassword] = useState('');

  const isSuper = role === 'super_admin';
  const applyRole = (r: string) => { setRole(r); setPerms(r === 'super_admin' ? [] : (rolePresets[r] ?? [])); };
  const toggle = (p: string) => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const save = useMutation({
    mutationFn: () => mode === 'create'
      ? adminsApi.create({ email: email.trim(), name: name.trim(), role, permissions: perms, password })
      : adminsApi.update(admin.id, { role, permissions: perms, ...(password ? { password } : {}) }),
    onSuccess: () => { toast.success(mode === 'create' ? 'Admin created' : 'Admin updated'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg glass-card rounded-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#f5f0e8]">{mode === 'create' ? 'Add admin' : `Edit ${admin?.name}`}</h2>
          <button onClick={onClose} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="w-5 h-5" /></button>
        </div>

        <div className="mt-4 space-y-4">
          {mode === 'create' && (
            <>
              <div><label className="block text-[13px] text-[#f5f0e8] mb-1.5">Email</label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@bucr.ng" /></div>
              <div><label className="block text-[13px] text-[#f5f0e8] mb-1.5">Name</label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            </>
          )}

          <div>
            <label className="block text-[13px] text-[#f5f0e8] mb-1.5">Role</label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map((r) => (
                <button key={r} onClick={() => applyRole(r)} className={cn('h-9 rounded-lg border text-[12px] font-medium',
                  role === r ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#f5f0e8]' : 'border-[rgba(255,255,255,0.12)] text-[#7a8fa6]')}>
                  {ROLE_LABELS[r] || r}
                </button>
              ))}
            </div>
          </div>

          {isSuper ? (
            <p className="text-[13px] text-[#c9a84c]">Super Admin has full, system-wide access to every resource.</p>
          ) : (
            <div>
              <label className="block text-[13px] text-[#f5f0e8] mb-2">Permissions</label>
              <div className="grid sm:grid-cols-2 gap-1.5 max-h-52 overflow-y-auto">
                {permissions.filter((p) => p !== 'admins.manage').map((p) => (
                  <label key={p} className="flex items-center gap-2 text-[13px] text-[#cdd8e6] cursor-pointer">
                    <input type="checkbox" checked={perms.includes(p)} onChange={() => toggle(p)} className="accent-[#c9a84c]" />
                    {prettyPerm(p)}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[13px] text-[#f5f0e8] mb-1.5">{mode === 'create' ? 'Initial password' : 'Reset password (optional)'}</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, letter + number" />
          </div>

          <Button className="w-full" disabled={save.isPending || (mode === 'create' && (!email || !name || password.length < 8))} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'create' ? 'Create admin' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
