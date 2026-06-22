'use client';

/**
 * Admin Users — full CRUD + credit adjustment, brand colors, real API data.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { usersApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Users, Search, Plus, CheckCircle, AlertTriangle, Clock,
  Eye, Trash2, Ban, PlayCircle, CreditCard, Loader2, X, Mail, Phone, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const CREDIT_VALUE_NGN = 10;

const STATUS_STYLE: Record<string, { bg: string; icon: any }> = {
  active:    { bg: 'text-emerald-400 bg-[rgba(52,211,153,0.1)]', icon: CheckCircle },
  suspended: { bg: 'text-[#f87171] bg-[rgba(248,113,113,0.1)]',  icon: AlertTriangle },
  banned:    { bg: 'text-[#f87171] bg-[rgba(248,113,113,0.1)]',  icon: AlertTriangle },
  inactive:  { bg: 'text-[#7a8fa6] bg-[rgba(122,143,166,0.1)]', icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg}`}>
      <s.icon className="h-3 w-3" />{status}
    </span>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,15,30,0.8)]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-[#0f2547] border border-[rgba(201,168,76,0.25)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]     = useState('');
  const [debSearch, setDeb]     = useState('');
  const [page, setPage]         = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [modal, setModal]       = useState<'none'|'add'|'view'|'credits'|'suspend'|'delete'>('none');
  const [selected, setSelected] = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [creditAmount, setCreditAmount]   = useState('');
  const [creditReason, setCreditReason]   = useState('');
  const [newForm, setNewForm] = useState({ name: '', email: '', phone: '', password: '' });

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__us);
    (window as any).__us = setTimeout(() => { setDeb(v); setPage(1); }, 300);
  };

  const closeModal = useCallback(() => {
    setModal('none'); setSelected(null);
    setSuspendReason(''); setCreditAmount(''); setCreditReason('');
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  // ── Queries ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page, debSearch, statusFilter],
    queryFn: () => usersApi.getAll({ page, limit: 20, search: debSearch || undefined, status: statusFilter || undefined }),
    keepPreviousData: true,
  } as any);

  // Backend may return users in data.data.users or data.data (array)
  const rawData = (data as any);
  const users   = rawData?.data?.users ?? rawData?.data ?? [];
  const total   = rawData?.data?.pagination?.total ?? rawData?.pagination?.total ?? users.length;

  // ── Mutations ─────────────────────────────────────────────────────────
  const suspendM = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => usersApi.suspend(id, reason),
    onSuccess: () => { invalidate(); toast.success('User suspended'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to suspend') });

  const activateM = useMutation({
    mutationFn: (id: string) => usersApi.activate(id),
    onSuccess: () => { invalidate(); toast.success('User activated'); },
    onError: () => toast.error('Failed to activate') });

  const deleteM = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => { invalidate(); toast.success('User deleted'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete') });

  const createM = useMutation({
    mutationFn: () => usersApi.create({ name: newForm.name, email: newForm.email, phone: newForm.phone || undefined, password: newForm.password }),
    onSuccess: () => { invalidate(); toast.success('User created'); closeModal(); setNewForm({ name:'', email:'', phone:'', password:'' }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create') });

  const creditM = useMutation({
    mutationFn: () => usersApi.adjustCredits(selected.id, parseInt(creditAmount), creditReason),
    onSuccess: () => { invalidate(); toast.success('Credits adjusted'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to adjust credits') });

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
            <Users className="h-6 w-6 text-[#0f2547]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Users</h1>
            <p className="text-[12px] text-[#7a8fa6]">{total} registered guests</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setModal('add')}>
          <Plus className="h-4 w-4" /> Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
          <Input value={search} onChange={e => handleSearch(e.target.value)}
            placeholder="Search by name or email…" className="pl-9" />
        </div>
        <div className="flex gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)] rounded-lg p-1">
          {['', 'active', 'suspended'].map(s => (
            <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === s ? 'bg-[#c9a84c] text-[#0f2547]' : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
              }`}>{s || 'All'}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.12)]">
                {['User', 'Credits', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(201,168,76,0.06)]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" style={{ width: `${55 + j * 8}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="py-16 text-center text-[#7a8fa6] text-sm">
                  {debSearch ? 'No users match your search' : 'No users yet'}
                </td></tr>
              ) : users.map((u: any) => (
                <tr key={u.id} className="border-b border-[rgba(201,168,76,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {u.avatar ? (
                        <img
                          src={u.avatar.startsWith('http') ? u.avatar : `${process.env.NEXT_PUBLIC_API_URL || ''}${u.avatar}`}
                          alt={u.name}
                          className="h-9 w-9 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-9 w-9 rounded-full bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[11px] font-bold text-[#c9a84c] flex-shrink-0">
                          {u.name?.charAt(0)?.toUpperCase() ?? '?'}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-[#f5f0e8] text-[13px]">{u.name}</p>
                        <p className="text-[11px] text-[#7a8fa6]">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] font-semibold text-[#f5f0e8]">{(u.creditsBalance || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-[#7a8fa6]">₦{((u.creditsBalance || 0) * CREDIT_VALUE_NGN).toLocaleString()} value</p>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={u.status ?? 'active'} /></td>
                  <td className="px-5 py-3.5 text-[12px] text-[#7a8fa6] whitespace-nowrap">
                    {u.createdAt ? formatDate(u.createdAt) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => { setSelected(u); setModal('view'); }} title="View details"
                        className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.06)] transition-all">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => { setSelected(u); setModal('credits'); }} title="Adjust credits"
                        className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                        <CreditCard className="h-4 w-4" />
                      </button>
                      {u.status === 'active' ? (
                        <button onClick={() => { setSelected(u); setModal('suspend'); }} title="Suspend user"
                          className="p-1.5 rounded-lg text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => activateM.mutate(u.id)} title="Activate user" disabled={activateM.isPending}
                          className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-emerald-400 hover:bg-[rgba(52,211,153,0.08)] transition-all">
                          <PlayCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => { setSelected(u); setModal('delete'); }} title="Delete user"
                        className="p-1.5 rounded-lg text-[rgba(248,113,113,0.5)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(201,168,76,0.1)]">
            <p className="text-[12px] text-[#7a8fa6]">Page {page} · {total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1,p-1))} disabled={page<=1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={users.length<20}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Add user */}
      {modal === 'add' && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Add User</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            {[['name','Full Name','John Doe'],['email','Email','user@email.ng'],['phone','Phone (optional)','+234 800 000 0000'],['password','Password','Min 8 characters']].map(([k,l,p]) => (
              <div key={k}>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">{l}</label>
                <Input value={(newForm as any)[k]} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))}
                  placeholder={p} type={k === 'password' ? 'password' : 'text'} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createM.mutate()} disabled={!newForm.name || !newForm.email || !newForm.password || createM.isPending} className="gap-2">
                {createM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create User
              </Button>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* View */}
      {modal === 'view' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">{selected.name}</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-3 text-[13px]">
            {[
              [Mail,       'Email',    selected.email],
              [Phone,      'Phone',    selected.phone ?? '—'],
              [CreditCard, 'Credits',  `${(selected.creditsBalance||0).toLocaleString()} (₦${((selected.creditsBalance||0)*CREDIT_VALUE_NGN).toLocaleString()})`],
              [Calendar,   'Joined',   selected.createdAt ? formatDate(selected.createdAt) : '—'],
            ].map(([Icon, label, value]) => (
              <div key={label as string} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                <Icon className="h-4 w-4 text-[#c9a84c] flex-shrink-0" />
                <span className="text-[#7a8fa6] w-20 flex-shrink-0">{label as string}</span>
                <span className="text-[#f5f0e8] font-medium">{value as string}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            <Button onClick={() => { closeModal(); setSelected(selected); setModal('credits'); }} variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" /> Adjust Credits
            </Button>
          </div>
        </ModalOverlay>
      )}

      {/* Adjust credits */}
      {modal === 'credits' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Adjust Credits</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <div className="p-4 rounded-xl bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.15)] mb-5">
            <p className="text-[13px] text-[#f5f0e8] font-semibold">{selected.name}</p>
            <p className="text-[12px] text-[#7a8fa6] mt-0.5">
              Current balance: <strong className="text-[#c9a84c]">{(selected.creditsBalance||0).toLocaleString()} credits</strong>
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">
                Amount (use negative to deduct)
              </label>
              <Input type="number" value={creditAmount} onChange={e => setCreditAmount(e.target.value)}
                placeholder="e.g. 100 or -50" />
              {creditAmount && !isNaN(parseInt(creditAmount)) && (
                <p className="text-[11px] text-[#7a8fa6] mt-1">
                  New balance: <strong className="text-[#c9a84c]">
                    {((selected.creditsBalance||0) + parseInt(creditAmount)).toLocaleString()} credits
                  </strong>
                </p>
              )}
            </div>
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Reason *</label>
              <Input value={creditReason} onChange={e => setCreditReason(e.target.value)}
                placeholder="e.g. Compensation for service issue" />
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => creditM.mutate()}
                disabled={!creditAmount || !creditReason.trim() || isNaN(parseInt(creditAmount)) || creditM.isPending}
                className="gap-2">
                {creditM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Apply Adjustment
              </Button>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Suspend */}
      {modal === 'suspend' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Suspend User</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <p className="text-[13px] text-[#7a8fa6] mb-4">Suspending <strong className="text-[#f5f0e8]">{selected.name}</strong> will revoke their access immediately.</p>
          <div className="mb-4">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Reason *</label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
              placeholder="State the reason for suspension…"
              className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[13px] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] resize-none" />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => suspendM.mutate({ id: selected.id, reason: suspendReason })}
              disabled={!suspendReason.trim() || suspendM.isPending}
              className="gap-2 bg-red-600 hover:bg-red-700 border-red-600 text-white">
              {suspendM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Suspend
            </Button>
            <Button variant="outline" onClick={closeModal}>Cancel</Button>
          </div>
        </ModalOverlay>
      )}

      {/* Delete confirm */}
      {modal === 'delete' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="text-center py-4 space-y-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.25)] mx-auto">
              <Trash2 className="h-7 w-7 text-[#f87171]" />
            </div>
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Delete User</h2>
            <p className="text-[13px] text-[#7a8fa6]">
              Soft-delete <strong className="text-[#f5f0e8]">{selected.name}</strong>?<br/>
              Their data is retained for compliance but they lose access.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={() => deleteM.mutate(selected.id)} disabled={deleteM.isPending}
                className="gap-2 bg-red-600 hover:bg-red-700 border-red-600 text-white">
                {deleteM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Delete
              </Button>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
}
