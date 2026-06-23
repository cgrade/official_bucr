'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Users, UserPlus, Trash2, X, Loader2, ShieldCheck, Mail } from 'lucide-react';

const PERM_LABELS: Record<string, string> = {
  check_in: 'Check guests in',
  cancel_reservation: 'Cancel reservations',
  modify_reservation: 'Modify reservations',
  view_reservations: 'View reservations',
  toggle_menu_availability: '86 / toggle menu items',
  manage_menu: 'Edit the menu',
  respond_reviews: 'Respond to reviews',
  manage_offers: 'Manage special offers',
  view_analytics: 'View analytics',
  manage_experiences: 'Manage experiences',
  manage_gallery: 'Manage gallery',
};

const STATUS_PILL: Record<string, string> = {
  active: 'bg-emerald-500/15 text-emerald-400',
  pending: 'bg-[rgba(201,168,76,0.18)] text-[#c9a84c]',
  disabled: 'bg-red-500/15 text-red-400',
};

export default function TeamPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['team'], queryFn: () => authApi.getTeam() });
  const team = data?.data;
  const staff: any[] = team?.staff ?? [];
  const delegatable: string[] = team?.delegatablePermissions ?? Object.keys(PERM_LABELS);
  const presets = team?.rolePresets ?? { manager: delegatable, staff: ['check_in', 'view_reservations', 'toggle_menu_availability'] };
  const seatLimit = team?.seatLimit ?? 0;
  const seatsUsed = team?.seatsUsed ?? staff.length;
  const atLimit = seatsUsed >= seatLimit;

  const [modal, setModal] = useState<null | { mode: 'invite' | 'edit'; staff?: any }>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ['team'] });

  const remove = useMutation({
    mutationFn: (id: string) => authApi.removeStaff(id),
    onSuccess: () => { toast.success('Team member removed'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to remove'),
  });
  const toggleStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'active' | 'disabled' }) => authApi.updateStaff(id, { status }),
    onSuccess: () => { toast.success('Updated'); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || 'Failed to update'),
  });

  if (isLoading) return <div className="p-8 text-[#7a8fa6]">Loading team…</div>;

  // Basic tier (no seats) → upsell
  if (seatLimit === 0) {
    return (
      <div className="p-6 md:p-8 max-w-2xl">
        <h1 className="font-display text-3xl font-semibold text-[#f5f0e8] flex items-center gap-2"><Users className="h-7 w-7 text-[#c9a84c]" /> Team</h1>
        <div className="mt-6 rounded-2xl border border-[rgba(201,168,76,0.2)] bg-[rgba(201,168,76,0.06)] p-6 text-center">
          <ShieldCheck className="h-9 w-9 mx-auto text-[#c9a84c]" />
          <p className="mt-3 text-[#f5f0e8] font-medium">Add your team on Pro or Elite</p>
          <p className="mt-1 text-[14px] text-[#7a8fa6]">Pro includes 1 staff account, Elite includes 3 — each with the exact permissions you choose (check-in, cancellations, and more).</p>
          <a href="/subscription"><Button className="mt-4">Upgrade plan</Button></a>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#f5f0e8] flex items-center gap-2"><Users className="h-7 w-7 text-[#c9a84c]" /> Team</h1>
          <p className="mt-1 text-[14px] text-[#7a8fa6]">{seatsUsed} of {seatLimit} staff {seatLimit === 1 ? 'seat' : 'seats'} used · staff log in at this portal with the permissions you grant.</p>
        </div>
        <Button onClick={() => setModal({ mode: 'invite' })} disabled={atLimit} className="gap-2">
          <UserPlus className="h-4 w-4" /> Invite staff
        </Button>
      </div>
      {atLimit && <p className="mt-2 text-[13px] text-[#c9a84c]">You’ve used all your seats. Remove a member or upgrade to add more.</p>}

      <div className="mt-6 space-y-3">
        {staff.length === 0 && <p className="text-[#7a8fa6]">No staff yet. Invite someone to help run your restaurant.</p>}
        {staff.map((s) => (
          <div key={s.id} className="rounded-xl border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-[#f5f0e8]">{s.name} <span className="text-[12px] text-[#7a8fa6]">· {s.role}</span></p>
                <p className="text-[13px] text-[#7a8fa6] flex items-center gap-1"><Mail className="h-3 w-3" /> {s.email}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {(s.permissions ?? []).length === 0 && <span className="text-[12px] text-[#7a8fa6]">No permissions</span>}
                  {(s.permissions ?? []).map((p: string) => (
                    <span key={p} className="text-[11px] rounded-full bg-[rgba(201,168,76,0.12)] text-[#c9a84c] px-2 py-0.5">{PERM_LABELS[p] || p}</span>
                  ))}
                </div>
              </div>
              <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0', STATUS_PILL[s.status])}>{s.status}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setModal({ mode: 'edit', staff: s })}>Edit permissions</Button>
              {s.status !== 'pending' && (
                <Button variant="outline" size="sm" onClick={() => toggleStatus.mutate({ id: s.id, status: s.status === 'active' ? 'disabled' : 'active' })}>
                  {s.status === 'active' ? 'Disable' : 'Enable'}
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-red-400 border-red-400/30 hover:bg-red-500/10" onClick={() => { if (confirm(`Remove ${s.name}?`)) remove.mutate(s.id); }}>
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            </div>
          </div>
        ))}
      </div>

      {modal && (
        <StaffModal
          mode={modal.mode}
          staff={modal.staff}
          delegatable={delegatable}
          presets={presets}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); invalidate(); }}
        />
      )}
    </div>
  );
}

function StaffModal({ mode, staff, delegatable, presets, onClose, onSaved }: {
  mode: 'invite' | 'edit'; staff?: any; delegatable: string[]; presets: Record<string, string[]>;
  onClose: () => void; onSaved: () => void;
}) {
  const [email, setEmail] = useState(staff?.email ?? '');
  const [name, setName] = useState(staff?.name ?? '');
  const [role, setRole] = useState<'manager' | 'staff'>(staff?.role ?? 'staff');
  const [perms, setPerms] = useState<string[]>(staff?.permissions ?? presets.staff ?? []);

  const applyPreset = (r: 'manager' | 'staff') => { setRole(r); setPerms(presets[r] ?? []); };
  const toggle = (p: string) => setPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const save = useMutation({
    mutationFn: () => mode === 'invite'
      ? authApi.inviteStaff({ email: email.trim(), name: name.trim() || undefined, role, permissions: perms })
      : authApi.updateStaff(staff.id, { role, permissions: perms }),
    onSuccess: () => { toast.success(mode === 'invite' ? 'Invitation sent' : 'Permissions updated'); onSaved(); },
    onError: (e: any) => toast.error(e?.response?.data?.error || e?.response?.data?.message || 'Failed'),
  });

  const labels: Record<string, string> = {
    check_in: 'Check guests in', cancel_reservation: 'Cancel reservations', modify_reservation: 'Modify reservations',
    view_reservations: 'View reservations', toggle_menu_availability: '86 / toggle menu items', manage_menu: 'Edit the menu',
    respond_reviews: 'Respond to reviews', manage_offers: 'Manage special offers', view_analytics: 'View analytics',
    manage_experiences: 'Manage experiences', manage_gallery: 'Manage gallery',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[rgba(201,168,76,0.2)] bg-[#0f2547] p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">{mode === 'invite' ? 'Invite staff' : `Edit ${staff?.name}`}</h2>
          <button onClick={onClose} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
        </div>

        <div className="mt-4 space-y-4">
          {mode === 'invite' && (
            <>
              <div>
                <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Email</label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff@email.com" />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Staff name" />
              </div>
            </>
          )}

          <div>
            <label className="block text-[13px] font-medium text-[#f5f0e8] mb-1.5">Role preset</label>
            <div className="flex gap-2">
              {(['staff', 'manager'] as const).map((r) => (
                <button key={r} onClick={() => applyPreset(r)} className={cn('flex-1 h-10 rounded-lg border text-[13px] font-medium capitalize',
                  role === r ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.12)] text-[#f5f0e8]' : 'border-[rgba(255,255,255,0.12)] text-[#7a8fa6]')}>{r}</button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-[#7a8fa6]">Presets just pre-fill the permissions — fine-tune below. Staff can never exceed your own privileges.</p>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#f5f0e8] mb-2">Permissions</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {delegatable.map((p) => (
                <label key={p} className="flex items-center gap-2 text-[13px] text-[#cdd8e6] cursor-pointer">
                  <input type="checkbox" checked={perms.includes(p)} onChange={() => toggle(p)} className="accent-[#c9a84c]" />
                  {labels[p] || p}
                </label>
              ))}
            </div>
          </div>

          <Button className="w-full" disabled={save.isPending || (mode === 'invite' && !email)} onClick={() => save.mutate()}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === 'invite' ? 'Send invitation' : 'Save permissions'}
          </Button>
        </div>
      </div>
    </div>
  );
}
