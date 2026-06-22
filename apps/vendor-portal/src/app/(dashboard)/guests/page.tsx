'use client';
import FeatureGate from '@/components/ui/FeatureGate';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { guestsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Users, Search, Star, Calendar, ChevronRight,
  Crown, TrendingUp, AlertCircle, X, Loader2, Save,
} from 'lucide-react';

// ── Types match the backend GuestProfile model ──────────────────────────────
interface Guest {
  id: string;                      // GuestProfile.id
  userId: string;
  visitCount: number;              // NOT totalVisits
  noShowCount: number;
  totalSpend: number;
  lastVisit: string | null;
  notes: string | null;
  tags: string[];
  preferences: any;
  isVip: boolean;
  user: {
    id: string;
    name: string;                  // NOT fullName
    email: string;
    phone: string | null;
    avatar: string | null;
    dietaryRestrictions: string[];
  };
}

function GuestCard({ guest, onSelect, selected }: {
  guest: Guest;
  onSelect: (g: Guest) => void;
  selected: boolean;
}) {
  return (
    <button onClick={() => onSelect(guest)}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        selected
          ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.08)]'
          : 'border-[rgba(201,168,76,0.15)] bg-[#0f2547] hover:border-[rgba(201,168,76,0.3)]'
      }`}>
      <div className="flex items-center gap-3">
        {guest.user?.avatar ? (
          <img
            src={guest.user.avatar.startsWith('http') ? guest.user.avatar : `${process.env.NEXT_PUBLIC_API_URL || ''}${guest.user.avatar}`}
            alt={guest.user.name}
            className="h-10 w-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(201,168,76,0.15)] text-[#c9a84c] text-sm font-bold flex-shrink-0">
            {guest.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-[#f5f0e8] text-[14px] truncate">{guest.user?.name ?? 'Guest'}</p>
            {guest.isVip && <Crown className="h-3.5 w-3.5 text-[#c9a84c] flex-shrink-0" />}
          </div>
          <p className="text-[11px] text-[#7a8fa6] truncate">{guest.user?.email}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-[13px] font-semibold text-[#f5f0e8]">{guest.visitCount}</p>
          <p className="text-[10px] text-[#7a8fa6]">visits</p>
        </div>
      </div>

      {/* Tags */}
      {guest.tags?.length > 0 && (
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {guest.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-[9px] font-semibold tracking-[0.1em] uppercase px-1.5 py-0.5 rounded bg-[rgba(201,168,76,0.1)] text-[#c9a84c]">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

function GuestsPageInner() {
  const [search, setSearch]       = useState('');
  const [debouncedSearch, setDebounced] = useState('');
  const [page, setPage]           = useState(1);
  const [vipOnly, setVipOnly]     = useState(false);
  const [selected, setSelected]   = useState<Guest | null>(null);
  const [notes, setNotes]         = useState('');
  const [tags, setTags]           = useState('');
  const [isVip, setIsVip]         = useState(false);
  const queryClient = useQueryClient();

  // Debounce search
  const handleSearch = (v: string) => {
    setSearch(v);
    clearTimeout((window as any).__guestSearch);
    (window as any).__guestSearch = setTimeout(() => { setDebounced(v); setPage(1); }, 300);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['guests', page, debouncedSearch, vipOnly],
    queryFn: () => guestsApi.getAll({ page, search: debouncedSearch || undefined }),
    keepPreviousData: true,
  } as any);

  // Backend returns paginated shape; handle both array and paginated response
  const rawData = (data as any);
  const guests: Guest[] = Array.isArray(rawData?.data)
    ? rawData.data
    : Array.isArray(rawData?.data?.profiles)
      ? rawData.data.profiles
      : [];
  const total = rawData?.pagination?.total ?? rawData?.data?.total ?? guests.length;
  const filtered = vipOnly ? guests.filter(g => g.isVip) : guests;

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      guestsApi.updateNotes(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast.success('Guest profile updated');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Update failed'),
  });

  const openGuest = (g: Guest) => {
    setSelected(g);
    setNotes(g.notes ?? '');
    setTags(g.tags?.join(', ') ?? '');
    setIsVip(g.isVip);
  };

  const saveGuest = () => {
    if (!selected) return;
    updateMutation.mutate({
      id: selected.userId,
      payload: {
        notes:   notes   || null,
        tags:    tags    ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        isVip,
      },
    });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
              <Users className="h-6 w-6 text-[#0f2547]" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-semibold text-[#f5f0e8]">Guest Profiles</h1>
              <p className="text-sm text-[#7a8fa6]">{total} guests in your CRM</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setVipOnly(!vipOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold border transition-all ${
                vipOnly
                  ? 'bg-[#c9a84c] border-[#c9a84c] text-[#0f2547]'
                  : 'border-[rgba(201,168,76,0.25)] text-[#7a8fa6] hover:border-[#c9a84c] hover:text-[#c9a84c]'
              }`}>
              <Crown className="h-3.5 w-3.5" />
              VIP Only
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Guest list */}
        <div className="w-80 flex-shrink-0 border-r border-[rgba(201,168,76,0.12)] flex flex-col">
          {/* Search */}
          <div className="p-4 border-b border-[rgba(201,168,76,0.1)]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
              <Input value={search} onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name…" className="pl-9 text-sm" />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center">
                <Users className="h-10 w-10 text-[rgba(201,168,76,0.3)] mx-auto mb-3" />
                <p className="text-sm text-[#7a8fa6]">
                  {debouncedSearch ? 'No guests found' : 'No guests yet'}
                </p>
                {!debouncedSearch && <p className="text-[11px] text-[rgba(122,143,166,0.6)] mt-1">Guests appear after their first check-in</p>}
              </div>
            ) : (
              filtered.map(g => (
                <GuestCard key={g.id} guest={g} onSelect={openGuest} selected={selected?.id === g.id} />
              ))
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="border-t border-[rgba(201,168,76,0.1)] p-3 flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}>
                Prev
              </Button>
              <span className="text-[11px] text-[#7a8fa6]">Page {page}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={guests.length < 20}>
                Next
              </Button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        <div className="flex-1 overflow-y-auto p-8">
          {!selected ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Users className="h-14 w-14 text-[rgba(201,168,76,0.2)] mb-4" />
              <p className="text-[#7a8fa6]">Select a guest to view their profile</p>
            </div>
          ) : (
            <motion.div key={selected.id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
              className="max-w-2xl space-y-6">

              {/* Guest header */}
              <div className="flex items-start gap-5">
                {selected.user?.avatar ? (
                  <img
                    src={selected.user.avatar.startsWith('http') ? selected.user.avatar : `${process.env.NEXT_PUBLIC_API_URL || ''}${selected.user.avatar}`}
                    alt={selected.user.name}
                    className="h-16 w-16 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(201,168,76,0.15)] text-[#c9a84c] text-2xl font-bold flex-shrink-0">
                    {selected.user?.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-2xl font-semibold text-[#f5f0e8]">{selected.user?.name}</h2>
                    {selected.isVip && <Crown className="h-5 w-5 text-[#c9a84c]" />}
                  </div>
                  <p className="text-[#7a8fa6] text-sm mt-0.5">{selected.user?.email}</p>
                  {selected.user?.phone && <p className="text-[#7a8fa6] text-sm">{selected.user.phone}</p>}
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Visits',      value: selected.visitCount },
                  { label: 'No-shows',    value: selected.noShowCount },
                  { label: 'Last Visit',  value: selected.lastVisit ? formatDate(selected.lastVisit) : '—' },
                ].map(s => (
                  <div key={s.label} className="bg-[#0f2547] border border-[rgba(201,168,76,0.15)] rounded-xl p-4 text-center">
                    <p className="text-xl font-semibold text-[#f5f0e8]">{s.value}</p>
                    <p className="text-[11px] text-[#7a8fa6] uppercase tracking-wide mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Dietary */}
              {selected.user?.dietaryRestrictions?.length > 0 && (
                <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.15)] rounded-xl p-4">
                  <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-[#7a8fa6] mb-2">Dietary Restrictions</p>
                  <div className="flex gap-2 flex-wrap">
                    {selected.user.dietaryRestrictions.map(d => (
                      <span key={d} className="text-[11px] px-2 py-1 rounded bg-[rgba(201,168,76,0.1)] text-[#c9a84c] font-medium">{d}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Editable fields */}
              <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.15)] rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-[#f5f0e8] text-[15px]">CRM Notes</h3>

                {/* VIP toggle */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <div onClick={() => setIsVip(!isVip)}
                    className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 cursor-pointer ${isVip ? 'bg-[#c9a84c]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${isVip ? 'translate-x-5' : ''}`} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#f5f0e8]">Mark as VIP</p>
                    <p className="text-[11px] text-[#7a8fa6]">VIPs appear first and are flagged for staff attention</p>
                  </div>
                </label>

                {/* Tags */}
                <div>
                  <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Tags (comma-separated)</label>
                  <Input value={tags} onChange={e => setTags(e.target.value)}
                    placeholder="regular, birthday, wine-lover" />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#7a8fa6] mb-1.5 block">Private notes</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)}
                    placeholder="Prefers window seats, celebrating anniversary in March…"
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(201,168,76,0.2)] text-[#f5f0e8] text-[13px] placeholder:text-[#7a8fa6] focus:outline-none focus:border-[#c9a84c] resize-none" />
                </div>

                <Button onClick={saveGuest} disabled={updateMutation.isPending} className="gap-2">
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  <Save className="h-4 w-4" />
                  Save Changes
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GuestsPage() {
  return <FeatureGate feature="guest_profiles"><GuestsPageInner /></FeatureGate>;
}
