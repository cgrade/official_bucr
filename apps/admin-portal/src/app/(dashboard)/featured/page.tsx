'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { featuredApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Star, Sparkles, Gift, Clock, Coins, Plus, Edit2, Trash2,
  CheckCircle, XCircle, Loader2, Calendar, Building2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type TabType     = 'packages' | 'spots';
type FeaturedType = 'restaurant' | 'experience' | 'offer';

const TYPE_STYLE: Record<FeaturedType, string> = {
  restaurant: 'bg-[rgba(201,168,76,0.15)] text-[#c9a84c]',
  experience: 'bg-[rgba(129,140,248,0.15)] text-[#818cf8]',
  offer:      'bg-[rgba(52,211,153,0.15)] text-emerald-400',
};

const TYPE_ICONS: Record<FeaturedType, React.ElementType> = {
  restaurant: Building2,
  experience: Sparkles,
  offer:      Gift,
};

function TypeBadge({ type }: { type: string }) {
  const Icon = TYPE_ICONS[type as FeaturedType] ?? Star;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${TYPE_STYLE[type as FeaturedType] ?? 'bg-[rgba(122,143,166,0.15)] text-[#7a8fa6]'}`}>
      <Icon className="h-3 w-3" />{type}
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

const INIT = { name: '', type: 'restaurant' as FeaturedType, description: '', creditsCost: 100, durationDays: 7, isActive: true, sortOrder: 0 };

export default function FeaturedPage() {
  const queryClient = useQueryClient();
  const [tab, setTab]           = useState<TabType>('packages');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]   = useState<any>(null);
  const [form, setForm]         = useState(INIT);
  const [typeFilter, setType]   = useState('');

  const closeModal = () => { setShowModal(false); setEditing(null); setForm(INIT); };

  const { data: pkgData, isLoading: loadingPkg } = useQuery({
    queryKey: ['featured-packages', typeFilter],
    queryFn: () => featuredApi.getPackages({ type: typeFilter || undefined }),
    enabled: tab === 'packages',
  });

  const { data: spotsData, isLoading: loadingSpots } = useQuery({
    queryKey: ['featured-spots', typeFilter],
    queryFn: () => featuredApi.getSpots({ type: typeFilter || undefined }),
    enabled: tab === 'spots',
  });

  const createM = useMutation({
    mutationFn: featuredApi.createPackage,
    onSuccess: () => { toast.success('Package created'); queryClient.invalidateQueries({ queryKey: ['featured-packages'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => featuredApi.updatePackage(id, payload),
    onSuccess: () => { toast.success('Package updated'); queryClient.invalidateQueries({ queryKey: ['featured-packages'] }); closeModal(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deletePkgM = useMutation({
    mutationFn: featuredApi.deletePackage,
    onSuccess: () => { toast.success('Package deleted'); queryClient.invalidateQueries({ queryKey: ['featured-packages'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const deleteSpotM = useMutation({
    mutationFn: featuredApi.deleteSpot,
    onSuccess: () => { toast.success('Spot removed'); queryClient.invalidateQueries({ queryKey: ['featured-spots'] }); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Failed'),
  });

  const openEdit = (pkg: any) => {
    setEditing(pkg);
    setForm({ name: pkg.name, type: pkg.type, description: pkg.description || '', creditsCost: pkg.creditsCost, durationDays: pkg.durationDays, isActive: pkg.isActive, sortOrder: pkg.sortOrder || 0 });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) updateM.mutate({ id: editing.id, payload: form });
    else createM.mutate(form);
  };

  const packages: any[] = pkgData?.data   ?? [];
  const spots: any[]    = spotsData?.data?.spots ?? spotsData?.data ?? [];

  const TH = ({ children }: { children: string }) => (
    <th className="px-5 py-3 text-left text-[10px] font-bold tracking-[0.15em] uppercase text-[#7a8fa6]">{children}</th>
  );

  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
            <Star className="h-6 w-6 text-[#0f2547]" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">Featured Management</h1>
            <p className="text-[12px] text-[#7a8fa6]">Marketing packages and active vendor spots</p>
          </div>
        </div>
        {tab === 'packages' && (
          <Button className="gap-2" onClick={() => { setEditing(null); setForm(INIT); setShowModal(true); }}>
            <Plus className="h-4 w-4" /> New Package
          </Button>
        )}
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-1 bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)] rounded-lg p-1">
          {(['packages', 'spots'] as TabType[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-md text-[12px] font-semibold capitalize transition-all ${
                tab === t ? 'bg-[#c9a84c] text-[#0f2547]' : 'text-[#7a8fa6] hover:text-[#f5f0e8]'
              }`}>{t}</button>
          ))}
        </div>

        <select value={typeFilter} onChange={e => setType(e.target.value)}
          className="h-9 px-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.18)] text-[#f5f0e8] text-[12px] focus:outline-none focus:border-[#c9a84c] appearance-none min-w-32">
          <option value="" className="bg-[#0f2547]">All Types</option>
          <option value="restaurant" className="bg-[#0f2547]">Restaurant</option>
          <option value="experience" className="bg-[#0f2547]">Experience</option>
          <option value="offer"      className="bg-[#0f2547]">Offer</option>
        </select>
      </div>

      {/* Packages table */}
      {tab === 'packages' && (
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
          {loadingPkg ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" /></div>
          ) : packages.length === 0 ? (
            <div className="py-16 text-center">
              <Star className="h-10 w-10 text-[rgba(201,168,76,0.2)] mx-auto mb-3" />
              <p className="text-[#7a8fa6] text-sm mb-4">No packages yet</p>
              <Button onClick={() => { setEditing(null); setForm(INIT); setShowModal(true); }} className="gap-2">
                <Plus className="h-4 w-4" /> Create First Package
              </Button>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(201,168,76,0.12)]">
                  {['Package','Type','Cost','Duration','Status','Uses',''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg: any) => (
                  <tr key={pkg.id} className="border-b border-[rgba(201,168,76,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-[#f5f0e8] text-[13px]">{pkg.name}</p>
                      {pkg.description && <p className="text-[11px] text-[#7a8fa6] truncate max-w-xs">{pkg.description}</p>}
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={pkg.type} /></td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-[13px] text-[#c9a84c] font-semibold">
                        <Coins className="h-3.5 w-3.5" />{pkg.creditsCost}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1 text-[12px] text-[#7a8fa6]">
                        <Clock className="h-3.5 w-3.5" />{pkg.durationDays}d
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {pkg.isActive
                        ? <span className="flex items-center gap-1 text-emerald-400 text-[12px]"><CheckCircle className="h-3.5 w-3.5" />Active</span>
                        : <span className="flex items-center gap-1 text-[#7a8fa6] text-[12px]"><XCircle className="h-3.5 w-3.5" />Inactive</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[#7a8fa6]">{pkg._count?.featuredSpots ?? 0}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(pkg)} title="Edit"
                          className="p-1.5 rounded-lg text-[#7a8fa6] hover:text-[#c9a84c] hover:bg-[rgba(201,168,76,0.08)] transition-all">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => deletePkgM.mutate(pkg.id)} title="Delete" disabled={deletePkgM.isPending}
                          className="p-1.5 rounded-lg text-[rgba(248,113,113,0.5)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-all">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Spots table */}
      {tab === 'spots' && (
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl overflow-hidden">
          {loadingSpots ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" /></div>
          ) : spots.length === 0 ? (
            <div className="py-16 text-center">
              <Calendar className="h-10 w-10 text-[rgba(201,168,76,0.2)] mx-auto mb-3" />
              <p className="text-[#7a8fa6] text-sm">No active featured spots</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[rgba(201,168,76,0.12)]">
                  {['Vendor','Package','Type','Period','Credits','Source',''].map(h => <TH key={h}>{h}</TH>)}
                </tr>
              </thead>
              <tbody>
                {spots.map((spot: any) => (
                  <tr key={spot.id} className="border-b border-[rgba(201,168,76,0.06)] hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-[rgba(201,168,76,0.1)] flex items-center justify-center text-[10px] font-bold text-[#c9a84c]">
                          {spot.vendor?.businessName?.charAt(0)?.toUpperCase() ?? 'V'}
                        </div>
                        <span className="font-medium text-[#f5f0e8] text-[13px]">{spot.vendor?.businessName ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-[#7a8fa6]">{spot.package?.name ?? '—'}</td>
                    <td className="px-5 py-3.5"><TypeBadge type={spot.type} /></td>
                    <td className="px-5 py-3.5 text-[12px] text-[#7a8fa6] whitespace-nowrap">
                      {spot.startDate ? formatDate(spot.startDate) : '—'} → {spot.endDate ? formatDate(spot.endDate) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-[12px]">
                      {(spot.creditsPaid ?? 0) > 0
                        ? <span className="text-[#c9a84c] font-semibold">{spot.creditsPaid}</span>
                        : <span className="text-[#7a8fa6]">Free</span>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px]">
                      {spot.addedByAdmin
                        ? <span className="text-[#c9a84c]">Admin</span>
                        : <span className="text-emerald-400">Purchased</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button onClick={() => deleteSpotM.mutate(spot.id)} title="Remove spot" disabled={deleteSpotM.isPending}
                        className="p-1.5 rounded-lg text-[rgba(248,113,113,0.5)] hover:text-[#f87171] hover:bg-[rgba(248,113,113,0.08)] transition-all">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Package modal */}
      {showModal && (
        <ModalOverlay onClose={closeModal}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-xl font-semibold text-[#f5f0e8]">{editing ? 'Edit Package' : 'New Package'}</h2>
            <button onClick={closeModal} className="text-[#7a8fa6] hover:text-[#f5f0e8]"><X className="h-5 w-5" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Package Name *</label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Premium Spotlight" required />
            </div>
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Type</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as FeaturedType }))}
                disabled={!!editing}
                className="w-full h-10 px-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-sm focus:outline-none focus:border-[#c9a84c] appearance-none">
                <option value="restaurant" className="bg-[#0f2547]">Restaurant</option>
                <option value="experience" className="bg-[#0f2547]">Experience</option>
                <option value="offer"      className="bg-[#0f2547]">Offer</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2}
                placeholder="Brief description of this package…"
                className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[13px] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Credits Cost</label>
                <Input type="number" value={form.creditsCost} min={1}
                  onChange={e => setForm(f => ({ ...f, creditsCost: parseInt(e.target.value) || 0 }))} required />
              </div>
              <div>
                <label className="text-[11px] font-bold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Duration (days)</label>
                <Input type="number" value={form.durationDays} min={1}
                  onChange={e => setForm(f => ({ ...f, durationDays: parseInt(e.target.value) || 1 }))} required />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <div onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${form.isActive ? 'bg-[#c9a84c]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-[13px] text-[rgba(245,240,232,0.75)]">Active (available for purchase)</span>
            </label>
            <div className="flex gap-3 pt-2">
              <Button type="submit" disabled={createM.isPending || updateM.isPending} className="flex-1 gap-2">
                {(createM.isPending || updateM.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editing ? 'Update' : 'Create'}
              </Button>
              <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </div>
  );
}
