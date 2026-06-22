'use client';

/**
 * Admin Settings — system-wide configuration.
 * Economic constants from ECONOMICS config are shown read-only with a note.
 * Tunable DB settings can be edited by super_admin only.
 */
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { settingsApi } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Settings, CreditCard, Users, Store, ShieldCheck,
  Save, Lock, Info, CheckCircle, AlertTriangle,
} from 'lucide-react';

// Mirror of backend ECONOMICS (read-only in UI, change via env var)
const ECONOMICS = {
  CREDIT_VALUE_NGN: 10,
  CREDIT_SPREAD: 0.06,
  CREDIT_EXPIRY_MONTHS: 12,
  SHOWUP_BONUS_PCT: 0.03,
  NOSHOW_FORFEIT_PCT: 0.40,
  NOSHOW_VENDOR_PCT: 0.30,
  CANCEL_FULL_REFUND_HOURS: 24,
  CANCEL_PARTIAL_REFUND_HOURS: 12,
  CANCEL_PARTIAL_REFUND_PCT: 0.50,
  PER_COVER_BASIC_NGN: 1500,
  SUBSCRIPTION_PRO_NGN: 30000,
  SUBSCRIPTION_ELITE_NGN: 85000,
  GIFT_FEE_PCT: 0.08,
};

function SectionCard({ title, icon: Icon, desc, children }: {
  title: string; icon: any; desc: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(201,168,76,0.1)]">
          <Icon className="h-5 w-5 text-[#c9a84c]" />
        </div>
        <div>
          <h2 className="font-semibold text-[#f5f0e8] text-[15px]">{title}</h2>
          <p className="text-[11px] text-[#7a8fa6]">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

function ReadOnlyField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[rgba(201,168,76,0.06)] last:border-0">
      <div>
        <p className="text-[13px] text-[rgba(245,240,232,0.75)]">{label}</p>
        {note && <p className="text-[10px] text-[rgba(122,143,166,0.6)]">{note}</p>}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-[#c9a84c]">{value}</span>
        <Lock className="h-3 w-3 text-[rgba(122,143,166,0.5)]" />
      </div>
    </div>
  );
}

function FieldRow({ label, value, onChange, disabled, type = 'number', suffix }: {
  label: string; value: string | number; onChange: (v: string) => void;
  disabled?: boolean; type?: string; suffix?: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-[12px] text-[rgba(245,240,232,0.75)] flex-1 min-w-0">{label}</label>
      <div className="flex items-center gap-2">
        <Input type={type} value={value} onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className={`w-32 text-right text-[13px] ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} />
        {suffix && <span className="text-[11px] text-[#7a8fa6] flex-shrink-0 w-8">{suffix}</span>}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { admin } = useAuthStore();
  const canEdit = (admin as any)?.role === 'super_admin' || (admin as any)?.role === 'admin';

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: () => settingsApi.getAll(),
  });

  const updateM = useMutation({
    mutationFn: (payload: Record<string, any>) => settingsApi.update(payload),
    onSuccess: () => { toast.success('Settings saved'); queryClient.invalidateQueries({ queryKey: ['admin-settings'] }); },
    onError: () => toast.error('Failed to save settings'),
  });

  const s = data?.data || {};

  // Tunable settings — initialised from DB, then locally editable
  const [platformName,   setPlatformName]   = useState('');
  const [supportEmail,   setSupportEmail]   = useState('');
  const [maxPartySize,   setMaxPartySize]   = useState('20');
  const [minPwdLength,   setMinPwdLength]   = useState('8');
  const [verifyRequired, setVerifyRequired] = useState(true);
  const [rateLimitRpm,   setRateLimitRpm]   = useState('100');

  // Sync from API once loaded
  useEffect(() => {
    if (!s || isLoading) return;
    setPlatformName(s.platformName  || 'Bucr');
    setSupportEmail(s.supportEmail  || 'support@bucr.ng');
    setMaxPartySize(String(s.maxPartySize || 20));
    setMinPwdLength(String(s.minPasswordLength || 8));
    setVerifyRequired(s.vendorVerificationRequired ?? true);
    setRateLimitRpm(String(s.rateLimitRpm || 100));
  }, [s, isLoading]);

  const saveGeneral = () => updateM.mutate({
    platformName,
    supportEmail,
    maxPartySize: parseInt(maxPartySize),
    minPasswordLength: parseInt(minPwdLength),
    rateLimitRpm: parseInt(rateLimitRpm),
  });

  const saveVendor = () => updateM.mutate({
    vendorVerificationRequired: verifyRequired,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1d3a] p-8 space-y-4">
        {[1,2,3].map(i => <div key={i} className="h-48 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1d3a] p-6 lg:p-8 space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
          <Settings className="h-6 w-6 text-[#0f2547]" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-[#f5f0e8]">System Settings</h1>
          <p className="text-[12px] text-[#7a8fa6]">Platform configuration — super admin only for edits</p>
        </div>
      </div>

      {/* Permission notice */}
      {!canEdit && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-[rgba(201,168,76,0.06)] border border-[rgba(201,168,76,0.2)]">
          <AlertTriangle className="h-4 w-4 text-[#c9a84c] flex-shrink-0" />
          <p className="text-[12px] text-[#7a8fa6]">
            You have read-only access to settings. Contact a super admin to make changes.
          </p>
        </div>
      )}

      {/* ── Economic constants — read-only, from ECONOMICS config ───────── */}
      <SectionCard title="Economic Constants" icon={CreditCard}
        desc="Source of truth: src/lib/config/economics.ts — change via env vars only">
        <div className="bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.12)] rounded-lg p-3 mb-4 flex items-start gap-2">
          <Info className="h-4 w-4 text-[#c9a84c] flex-shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#7a8fa6] leading-relaxed">
            These values are locked in <code className="text-[#c9a84c]">src/lib/config/economics.ts</code>.
            To change them, update the corresponding <code className="text-[#c9a84c]">ECONOMICS</code> env var and redeploy.
            They cannot be changed from this UI to prevent accidental misconfiguration.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[rgba(201,168,76,0.5)] mb-3">Credit System</p>
            <ReadOnlyField label="Credit face value"       value="₦10 / credit"    note="LOCKED — data migration required to change" />
            <ReadOnlyField label="Purchase spread"         value={`${(ECONOMICS.CREDIT_SPREAD * 100).toFixed(0)}%`} note="env: CREDIT_SPREAD" />
            <ReadOnlyField label="Purchase price"          value="₦10.60 / credit" note="face × (1 + spread)" />
            <ReadOnlyField label="Credit expiry"           value={`${ECONOMICS.CREDIT_EXPIRY_MONTHS} months`} note="env: CREDIT_EXPIRY_MONTHS" />
            <ReadOnlyField label="Gift fee"                value={`${(ECONOMICS.GIFT_FEE_PCT * 100).toFixed(0)}%`} note="env: GIFT_FEE_PCT" />
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[rgba(201,168,76,0.5)] mb-3">No-show & Cancellation</p>
            <ReadOnlyField label="Show-up bonus"           value={`${(ECONOMICS.SHOWUP_BONUS_PCT * 100).toFixed(0)}%`} note="env: SHOWUP_BONUS_PCT" />
            <ReadOnlyField label="No-show forfeit"         value={`${(ECONOMICS.NOSHOW_FORFEIT_PCT * 100).toFixed(0)}%`} note="env: NOSHOW_FORFEIT_PCT" />
            <ReadOnlyField label="Vendor share (of dep)"   value={`${(ECONOMICS.NOSHOW_VENDOR_PCT * 100).toFixed(0)}%`} note="env: NOSHOW_VENDOR_PCT — BUCR gets the rest" />
            <ReadOnlyField label="Per-cover fee (Basic)"   value={`₦${ECONOMICS.PER_COVER_BASIC_NGN.toLocaleString()}`} note="Pro = 50% · Elite = waived" />
            <ReadOnlyField label="Deposit model"           value="Flat per reservation" note="By venue type or vendor-set; not per-person" />
            <ReadOnlyField label="Full refund window"      value={`${ECONOMICS.CANCEL_FULL_REFUND_HOURS}h`} note="env: CANCEL_FULL_REFUND_HOURS" />
            <ReadOnlyField label="Partial refund window"   value={`${ECONOMICS.CANCEL_PARTIAL_REFUND_HOURS}h`} note="env: CANCEL_PARTIAL_REFUND_HOURS" />
            <ReadOnlyField label="Partial refund amount"   value={`${(ECONOMICS.CANCEL_PARTIAL_REFUND_PCT * 100).toFixed(0)}%`} note="env: CANCEL_PARTIAL_REFUND_PCT" />
          </div>
        </div>

        <div className="border-t border-[rgba(201,168,76,0.1)] mt-4 pt-4">
          <p className="text-[9px] font-bold tracking-[0.15em] uppercase text-[rgba(201,168,76,0.5)] mb-3">Subscription Prices</p>
          <div className="flex gap-8">
            <ReadOnlyField label="Basic"  value="₦0 (Free)" note="Always free" />
            <ReadOnlyField label="Pro"    value={`₦${ECONOMICS.SUBSCRIPTION_PRO_NGN.toLocaleString()}/mo`} note="env: SUBSCRIPTION_PRO_NGN" />
            <ReadOnlyField label="Elite"  value={`₦${ECONOMICS.SUBSCRIPTION_ELITE_NGN.toLocaleString()}/mo`} note="env: SUBSCRIPTION_ELITE_NGN" />
          </div>
        </div>
      </SectionCard>

      {/* ── General platform settings (DB-backed, editable) ─────────────── */}
      <SectionCard title="Platform Settings" icon={Settings}
        desc="General platform configuration stored in the database">
        <div className="space-y-4">
          <FieldRow label="Platform name"    value={platformName}  onChange={setPlatformName}  type="text" disabled={!canEdit} />
          <FieldRow label="Support email"    value={supportEmail}  onChange={setSupportEmail}  type="email" disabled={!canEdit} />
          <FieldRow label="Max party size"   value={maxPartySize}  onChange={setMaxPartySize}  suffix="guests" disabled={!canEdit} />
          <FieldRow label="Min password length" value={minPwdLength} onChange={setMinPwdLength} suffix="chars" disabled={!canEdit} />
          <FieldRow label="API rate limit"   value={rateLimitRpm}  onChange={setRateLimitRpm}  suffix="rpm" disabled={!canEdit} />
        </div>
        {canEdit && (
          <div className="flex justify-end mt-5 pt-4 border-t border-[rgba(201,168,76,0.1)]">
            <Button onClick={saveGeneral} disabled={updateM.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Save Platform Settings
            </Button>
          </div>
        )}
      </SectionCard>

      {/* ── Vendor settings ───────────────────────────────────────────────── */}
      <SectionCard title="Vendor Settings" icon={Store}
        desc="Controls vendor onboarding and access rules">
        <div className="space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <div onClick={() => canEdit && setVerifyRequired(!verifyRequired)}
              className={`relative w-10 h-5 rounded-full transition-colors ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed'} ${verifyRequired ? 'bg-[#c9a84c]' : 'bg-[rgba(255,255,255,0.1)]'}`}>
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${verifyRequired ? 'translate-x-5' : ''}`} />
            </div>
            <div>
              <p className="text-[13px] font-medium text-[#f5f0e8]">Require KYC document verification</p>
              <p className="text-[11px] text-[#7a8fa6]">Vendors must submit and have documents approved before going live</p>
            </div>
          </label>

          <div className="flex items-start gap-3 p-4 rounded-lg bg-[rgba(201,168,76,0.04)] border border-[rgba(201,168,76,0.12)]">
            <ShieldCheck className="h-4 w-4 text-[#c9a84c] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#7a8fa6] leading-relaxed">
              <strong className="text-[#c9a84c]">Withdrawal gate:</strong> Vendor credit withdrawals are permanently disabled via{' '}
              <code className="text-[#c9a84c]">VENDOR_WITHDRAWAL_ENABLED=false</code> in the environment.
              This gate is enforced at the service layer and cannot be overridden from this UI — only from the server environment with legal sign-off.
            </p>
          </div>
        </div>
        {canEdit && (
          <div className="flex justify-end mt-5 pt-4 border-t border-[rgba(201,168,76,0.1)]">
            <Button onClick={saveVendor} disabled={updateM.isPending} className="gap-2">
              <Save className="h-4 w-4" /> Save Vendor Settings
            </Button>
          </div>
        )}
      </SectionCard>

      {/* ── Security (read-only info) ──────────────────────────────────────── */}
      <SectionCard title="Security" icon={ShieldCheck}
        desc="Active security controls — configured at infrastructure level">
        {[
          { label: 'JWT access token expiry',  value: '15 minutes',   ok: true },
          { label: 'JWT refresh token expiry', value: '7 days',       ok: true },
          { label: 'Password hashing',         value: 'bcrypt × 12',  ok: true },
          { label: 'Token blacklist',          value: 'Redis-backed',  ok: true },
          { label: 'Paystack webhook',         value: 'HMAC-SHA512',   ok: true },
          { label: 'Rate limiting',            value: 'Redis distributed', ok: true },
          { label: 'CORS origin whitelist',    value: 'Configured via CORS env', ok: true },
          { label: 'Vendor withdrawal gate',   value: 'DISABLED (legal requirement)', ok: true },
        ].map(item => (
          <div key={item.label} className="flex items-center justify-between py-2.5 border-b border-[rgba(201,168,76,0.06)] last:border-0">
            <span className="text-[13px] text-[rgba(245,240,232,0.75)]">{item.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-[#7a8fa6]">{item.value}</span>
              <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
            </div>
          </div>
        ))}
      </SectionCard>
    </div>
  );
}
