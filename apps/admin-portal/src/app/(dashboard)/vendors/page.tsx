'use client';

/**
 * Admin Vendors — full CRUD: create, verify, suspend, activate, delete, view docs
 * All data from backend API, no mocks.
 */
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { vendorsApi, documentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  Store, Search, Plus, CheckCircle, XCircle, Clock, AlertTriangle,
  MoreHorizontal, Eye, Trash2, Shield, Ban, PlayCircle, FileText,
  Loader2, X, MapPin, Crown, Phone, Mail, Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// ── Shared UI atoms ──────────────────────────────────────────────────────────
const TIER_STYLE: Record<string, string> = {
  basic: 'bg-[rgba(122,143,166,0.15)] text-[#7a8fa6]',
  pro:   'bg-[rgba(201,168,76,0.15)] text-[#c9a84c]',
  elite: 'bg-[#c9a84c] text-[#0f2547]',
};
const STATUS_STYLE: Record<string, { bg: string; icon: any }> = {
  approved: { bg: 'text-emerald-400 bg-[rgba(52,211,153,0.1)]', icon: CheckCircle },
  rejected: { bg: 'text-[#f87171]  bg-[rgba(248,113,113,0.1)]', icon: XCircle },
  pending:  { bg: 'text-[#c9a84c]  bg-[rgba(201,168,76,0.1)]',  icon: Clock },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? STATUS_STYLE.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${s.bg}`}>
      <s.icon className="h-3 w-3" />
      {status}
    </span>
  );
}

function ModalOverlay({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(7,15,30,0.8)]" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#0f2547] border border-[rgba(201,168,76,0.25)] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        {children}
      </div>
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
export default function VendorsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch]       = useState('');
  const [debSearch, setDeb]       = useState('');
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatus] = useState('');
  const [modal, setModal]         = useState<'none'|'add'|'view'|'suspend'|'delete'|'docs'>('none');
  const [selected, setSelected]   = useState<any>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [vendorDocs, setVendorDocs]       = useState<any[]>([]);
  const [rejectReason, setRejectReason]   = useState('');
  const [rejectDocId, setRejectDocId]     = useState<string|null>(null);
  const [loadingDocs, setLoadingDocs]     = useState(false);
  const [newForm, setNewForm] = useState({
    businessName: '', email: '', phone: '',
    ownerName: '', ownerEmail: '', ownerPassword: '',
    subscriptionTier: 'basic' as 'basic'|'pro'|'elite',
  });

  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__vs);
    (window as any).__vs = setTimeout(() => { setDeb(v); setPage(1); }, 300);
  };

  const closeModal = useCallback(() => {
    setModal('none'); setSelected(null);
    setSuspendReason(''); setRejectReason(''); setRejectDocId(null); setVendorDocs([]);
  }, []);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-vendors'] });

  // ── Queries ────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors', page, debSearch, statusFilter],
    queryFn: () => vendorsApi.getAll({ page, limit: 20, search: debSearch || undefined, status: statusFilter || undefined }),
    keepPreviousData: true,
  } as any);

  const d: any = data;
  const vendors: any[] = d?.data?.vendors ?? (Array.isArray(d?.data) ? d.data : []);
  const total: number  = d?.data?.pagination?.total ?? d?.pagination?.total ?? vendors.length;

  // ── Mutations ─────────────────────────────────────────────────────────
  const verifyM  = useMutation({ mutationFn: (id: string) => vendorsApi.verify(id),
    onSuccess: () => { invalidate(); toast.success('Vendor verified'); closeModal(); },
    onError: () => toast.error('Failed to verify') });

  const suspendM = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => vendorsApi.suspend(id, reason),
    onSuccess: () => { invalidate(); toast.success('Vendor suspended'); closeModal(); },
    onError: () => toast.error('Failed to suspend') });

  const activateM = useMutation({ mutationFn: (id: string) => vendorsApi.activate(id),
    onSuccess: () => { invalidate(); toast.success('Vendor activated'); },
    onError: () => toast.error('Failed to activate') });

  const deleteM  = useMutation({ mutationFn: (id: string) => vendorsApi.delete(id),
    onSuccess: () => { invalidate(); toast.success('Vendor deleted'); closeModal(); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete') });

  const createM  = useMutation({ mutationFn: () => vendorsApi.create(newForm),
    onSuccess: () => { invalidate(); toast.success('Vendor created'); closeModal();
      setNewForm({ businessName:'', email:'', phone:'', ownerName:'', ownerEmail:'', ownerPassword:'', subscriptionTier:'basic' }); },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to create') });

  const approveDocM = useMutation({
    mutationFn: (docId: string) => documentsApi.approve(docId),
    onSuccess: () => { toast.success('Document approved'); fetchDocs(selected?.id); invalidate(); },
    onError: () => toast.error('Failed to approve') });

  const rejectDocM = useMutation({
    mutationFn: ({ docId, reason }: { docId: string; reason: string }) => documentsApi.reject(docId, reason),
    onSuccess: () => { toast.success('Document rejected'); fetchDocs(selected?.id); setRejectDocId(null); setRejectReason(''); },
    onError: () => toast.error('Failed to reject') });

  const fetchDocs = async (vendorId: string) => {
    if (!vendorId) return;
    setLoadingDocs(true);
    try {
      const res = await vendorsApi.getById(vendorId);
      setVendorDocs((res as any)?.data?.documents ?? []);
    } catch { setVendorDocs([]); }
    finally { setLoadingDocs(false); }
  };

  const openView = (v: any) => { setSelected(v); setModal('view'); };
  const openDocs = (v: any) => { setSelected(v); setModal('docs'); fetchDocs(v.id); };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
            <Store className="h-6 w-6 text-[#0f2547]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Vendors</h1>
            <p className="text-[12px] text-[#7a8fa6]">{total} restaurants on the platform</p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setModal('add')}>
          <Plus className="h-4 w-4" /> Add Vendor
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
          {['', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s || 'all'} onClick={() => { setStatus(s); setPage(1); }}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                statusFilter === s ? 'bg-[#c9a84c] text-[#0f2547]' : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
              }`}>
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[rgba(201,168,76,0.12)]">
                {['Restaurant', 'Owner', 'Status', 'Tier', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-[rgba(201,168,76,0.06)]">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" style={{ width: `${60 + j * 10}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : vendors.length === 0 ? (
                <tr><td colSpan={6} className="py-16 text-center text-[#7a8fa6] text-sm">
                  {debSearch ? 'No vendors match your search' : 'No vendors yet'}
                </td></tr>
              ) : vendors.map((v: any) => (
                <tr key={v.id} className="border-b border-[rgba(201,168,76,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[11px] font-bold text-[#c9a84c] flex-shrink-0">
                        {v.businessName?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-[#f5f0e8] text-[13px]">{v.businessName}</p>
                        <p className="text-[11px] text-[#7a8fa6]">{v.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-[13px] text-[rgba(245,240,232,0.7)]">{v.ownerName ?? v.phone ?? '—'}</p>
                  </td>
                  <td className="px-5 py-3.5"><StatusBadge status={v.verificationStatus} /></td>
                  <td className="px-5 py-3.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${TIER_STYLE[(v.subscriptionTier || 'basic').replace('premium','elite')] ?? TIER_STYLE.basic}`}>
                      {(v.subscriptionTier || 'Basic').replace('premium','elite')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-[#7a8fa6] whitespace-nowrap">
                    {v.createdAt ? formatDate(v.createdAt) : '—'}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openView(v)} title="View details"
                        className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#f5f0e8] hover:bg-[rgba(255,255,255,0.06)] transition-all">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button onClick={() => openDocs(v)} title="View documents"
                        className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                        <FileText className="h-4 w-4" />
                      </button>
                      {v.verificationStatus === 'pending' && (
                        <button onClick={() => verifyM.mutate(v.id)} title="Approve vendor" disabled={verifyM.isPending}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-[rgba(52,211,153,0.08)] transition-all">
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {v.verificationStatus === 'approved' ? (
                        <button onClick={() => { setSelected(v); setModal('suspend'); }} title="Suspend vendor"
                          className="p-1.5 rounded-lg text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                          <Ban className="h-4 w-4" />
                        </button>
                      ) : (
                        <button onClick={() => activateM.mutate(v.id)} title="Activate vendor" disabled={activateM.isPending}
                          className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-emerald-400 hover:bg-[rgba(52,211,153,0.08)] transition-all">
                          <PlayCircle className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => { setSelected(v); setModal('delete'); }} title="Delete vendor"
                        className="p-1.5 rounded-lg text-[rgba(248,113,113,0.6)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(201,168,76,0.1)]">
            <p className="text-[12px] text-[#7a8fa6]">Showing page {page} · {total} total</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page <= 1}>Prev</Button>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p+1)} disabled={vendors.length < 20}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────── */}

      {/* Add vendor */}
      {modal === 'add' && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Add Vendor</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-4">
            {[
              ['businessName','Business Name','The Great Kitchen'],
              ['email','Vendor Email','vendor@restaurant.ng'],
              ['phone','Phone Number','+234 800 000 0000'],
            ].map(([key, label, ph]) => (
              <div key={key}>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">{label}</label>
                <Input value={(newForm as any)[key]} onChange={e => setNewForm(f => ({ ...f, [key]: e.target.value }))} placeholder={ph} />
              </div>
            ))}
            <div className="border-t border-[rgba(201,168,76,0.15)] pt-4">
              <p className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-3">Owner Account</p>
              {[['ownerName','Full Name','John Doe'],['ownerEmail','Email','owner@email.ng'],['ownerPassword','Password','Min 8 characters']].map(([k,l,p]) => (
                <div key={k} className="mb-3">
                  <label className="text-[11px] font-semibold text-[#7a8fa6] mb-1.5 block">{l}</label>
                  <Input value={(newForm as any)[k]} onChange={e => setNewForm(f => ({ ...f, [k]: e.target.value }))}
                    placeholder={p} type={k === 'ownerPassword' ? 'password' : 'text'} />
                </div>
              ))}
              <div>
                <label className="text-[11px] font-semibold text-[#7a8fa6] mb-1.5 block">Subscription Tier</label>
                <select value={newForm.subscriptionTier} onChange={e => setNewForm(f => ({ ...f, subscriptionTier: e.target.value as any }))}
                  className="w-full h-10 px-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-sm focus:outline-none focus:border-[#c9a84c] appearance-none">
                  <option value="basic" className="bg-[#0f2547]">Basic (Free)</option>
                  <option value="pro"   className="bg-[#0f2547]">Pro (₦30,000/mo)</option>
                  <option value="elite" className="bg-[#0f2547]">Elite (₦85,000/mo)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <Button onClick={() => createM.mutate()} disabled={createM.isPending || !newForm.businessName || !newForm.ownerEmail} className="gap-2">
                {createM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Create Vendor
              </Button>
              <Button variant="outline" onClick={closeModal}>Cancel</Button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* View details */}
      {modal === 'view' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">{selected.businessName}</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <div className="space-y-3 text-[13px]">
            {[
              [Mail,     'Email',       selected.email],
              [Phone,    'Phone',       selected.phone ?? '—'],
              [MapPin,   'Status',      selected.verificationStatus],
              [Crown,    'Tier',        (selected.subscriptionTier ?? 'basic').replace('premium','elite')],
              [Calendar, 'Joined',      selected.createdAt ? formatDate(selected.createdAt) : '—'],
            ].map(([Icon, label, value]) => (
              <div key={label as string} className="flex items-center gap-3 p-3 rounded-lg bg-[rgba(255,255,255,0.03)]">
                <Icon className="h-4 w-4 text-[#c9a84c] flex-shrink-0" />
                <span className="text-[#7a8fa6] w-20 flex-shrink-0">{label as string}</span>
                <span className="text-[#f5f0e8] font-medium">{value as string}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5 flex-wrap">
            <Button onClick={() => openDocs(selected)} variant="outline" className="gap-2">
              <FileText className="h-4 w-4" /> View KYC
            </Button>
            {selected.verificationStatus === 'pending' && (
              <Button onClick={() => verifyM.mutate(selected.id)} disabled={verifyM.isPending} className="gap-2">
                <CheckCircle className="h-4 w-4" /> Verify
              </Button>
            )}
            {selected.verificationStatus === 'approved' ? (
              <Button onClick={() => { closeModal(); setSelected(selected); setModal('suspend'); }} variant="secondary" className="gap-2">
                <Ban className="h-4 w-4" /> Suspend
              </Button>
            ) : (
              <Button onClick={() => { activateM.mutate(selected.id); closeModal(); }} variant="secondary" className="gap-2">
                <PlayCircle className="h-4 w-4" /> Activate
              </Button>
            )}
          </div>
        </ModalOverlay>
      )}

      {/* Suspend */}
      {modal === 'suspend' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Suspend Vendor</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <p className="text-[13px] text-[#7a8fa6] mb-4">You are suspending <strong className="text-[#f5f0e8]">{selected.businessName}</strong>. They will lose access to the platform.</p>
          <div className="mb-4">
            <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Reason *</label>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} rows={3}
              placeholder="Provide a clear reason for suspension…"
              className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[13px] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] resize-none" />
          </div>
          <div className="flex gap-3">
            <Button onClick={() => suspendM.mutate({ id: selected.id, reason: suspendReason })}
              disabled={!suspendReason.trim() || suspendM.isPending}
              className="gap-2 bg-red-600 hover:bg-red-700 border-red-600 text-white">
              {suspendM.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Suspend Vendor
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
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">Delete Vendor</h2>
            <p className="text-[13px] text-[#7a8fa6]">
              Permanently delete <strong className="text-[#f5f0e8]">{selected.businessName}</strong>?<br/>
              This is a soft-delete — data is retained for compliance but the vendor loses all access.
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

      {/* KYC Documents */}
      {modal === 'docs' && selected && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">KYC Documents</h2>
              <p className="text-[12px] text-[#7a8fa6]">{selected.businessName}</p>
            </div>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          {loadingDocs ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" /></div>
          ) : vendorDocs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-10 w-10 text-[rgba(201,168,76,0.3)] mx-auto mb-3" />
              <p className="text-[13px] text-[#7a8fa6]">No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vendorDocs.map((doc: any) => (
                <div key={doc.id} className="p-4 rounded-xl border border-[rgba(201,168,76,0.15)] bg-[rgba(255,255,255,0.02)]">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-semibold text-[#f5f0e8] text-[13px] capitalize">{doc.type?.replace(/_/g,' ')}</p>
                      <StatusBadge status={doc.status} />
                    </div>
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[11px] text-[#c9a84c] hover:text-[#f5f0e8] underline">View file ↗</a>
                  </div>
                  {doc.status === 'pending' && (
                    rejectDocId === doc.id ? (
                      <div className="space-y-2">
                        <Input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Rejection reason…" />
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => rejectDocM.mutate({ docId: doc.id, reason: rejectReason })}
                            disabled={!rejectReason.trim() || rejectDocM.isPending}
                            className="bg-red-600 hover:bg-red-700 border-red-600 text-white text-[12px]">
                            Confirm Reject
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectDocId(null); setRejectReason(''); }}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => approveDocM.mutate(doc.id)} disabled={approveDocM.isPending} className="gap-1 text-[12px]">
                          <CheckCircle className="h-3 w-3" /> Approve
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setRejectDocId(doc.id)} className="gap-1 text-[12px]">
                          <XCircle className="h-3 w-3" /> Reject
                        </Button>
                      </div>
                    )
                  )}
                </div>
              ))}
            </div>
          )}
        </ModalOverlay>
      )}
    </div>
  );
}
