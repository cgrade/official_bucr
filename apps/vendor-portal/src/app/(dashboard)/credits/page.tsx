'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { creditsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import {
  Wallet, TrendingUp, TrendingDown, Clock, Star, Users, Sparkles, Megaphone, Crown,
  Plus, X, Loader2, CreditCard, CheckCircle2,
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  purchase: 'Credit Purchase',
  redemption: 'Diner Redemption',
  no_show_share: 'No-Show Share',
  review_response: 'Review Bonus',
  featured_spend: 'Featured Placement',
  marketing_spend: 'Marketing',
  adjustment: 'Adjustment',
  bonus: 'Bonus',
};

const CREDIT_PACKAGES = [
  { credits: 50, popular: false },
  { credits: 100, popular: true },
  { credits: 250, popular: false },
  { credits: 500, popular: false },
];

export default function CreditsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [customCredits, setCustomCredits] = useState('');
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const { data: walletData, isLoading: walletLoading } = useQuery({
    queryKey: ['vendor-wallet'],
    queryFn: () => creditsApi.getWallet(),
  });

  const { data: txData } = useQuery({
    queryKey: ['vendor-transactions'],
    queryFn: () => creditsApi.getTransactions(1, 20),
  });

  // Handle payment callback
  useEffect(() => {
    const reference = searchParams.get('reference');
    if (reference && !isVerifying) {
      setIsVerifying(true);
      creditsApi.completePurchase(reference)
        .then((res) => {
          if (res.success) {
            toast.success(res.message || 'Credits added to your wallet!');
            queryClient.invalidateQueries({ queryKey: ['vendor-wallet'] });
            queryClient.invalidateQueries({ queryKey: ['vendor-transactions'] });
          }
        })
        .catch((err) => {
          toast.error(err.response?.data?.message || 'Failed to verify payment');
        })
        .finally(() => {
          setIsVerifying(false);
          // Remove reference from URL
          window.history.replaceState({}, '', '/credits');
        });
    }
  }, [searchParams, queryClient, isVerifying]);

  const purchaseMutation = useMutation({
    mutationFn: (credits: number) => creditsApi.initPurchase(credits, `${window.location.origin}/credits`),
    onSuccess: (res) => {
      if (res.data?.authorizationUrl) {
        window.location.href = res.data.authorizationUrl;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to initialize purchase');
    },
  });

  const handlePurchase = () => {
    const credits = selectedPackage || parseInt(customCredits);
    if (!credits || credits < 10) {
      toast.error('Minimum purchase is 10 credits');
      return;
    }
    purchaseMutation.mutate(credits);
  };

  const wallet = walletData?.data?.wallet;
  const transactions = txData?.data?.transactions || [];
  const balanceInNaira = (wallet?.balance || 0) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Bucr Credits</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Purchase, earn, and spend credits on the platform</p>
          </div>
          <Button onClick={() => setShowPurchaseModal(true)} className="btn-primary">
            <Plus className="h-4 w-4 mr-2" />Buy Credits
          </Button>
        </div>

        {/* Wallet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="glass-card rounded-2xl p-6 bg-gradient-to-br from-primary-500 to-tertiary-500 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Wallet className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-white/80">Available Balance</p>
                <p className="text-2xl font-bold">{walletLoading ? '...' : (wallet?.balance || 0).toLocaleString()} credits</p>
              </div>
            </div>
            <div className="text-sm text-white/80">≈ {formatCurrency(balanceInNaira)}</div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Earned</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{(wallet?.totalEarned || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Spent</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{(wallet?.totalSpent || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">This Month</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  +{walletData?.data?.summary?.last30Days?.reduce((sum: number, s: any) => sum + (s.total > 0 ? s.total : 0), 0)?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* How to Earn & Spend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* How to Earn */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" /> How You Earn
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 dark:bg-green-900/20">
                <Users className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Diner Check-ins</p>
                  <p className="text-sm text-slate-500">Earn credits when diners redeem their reservation deposit</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20">
                <Clock className="h-5 w-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">No-Show Share</p>
                  <p className="text-sm text-slate-500">Receive 50% of forfeited credits when diners don&apos;t show</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                <Star className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Review Responses</p>
                  <p className="text-sm text-slate-500">Earn bonus credits for responding to customer reviews</p>
                </div>
              </div>
            </div>
          </div>

          {/* How to Spend */}
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-rose-600" /> How to Spend
            </h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-purple-50 dark:bg-purple-900/20">
                <Sparkles className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Featured Placement</p>
                  <p className="text-sm text-slate-500">Boost your visibility in search results and listings</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20">
                <Megaphone className="h-5 w-5 text-rose-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Marketing Tools</p>
                  <p className="text-sm text-slate-500">Promote special offers and events to diners</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-tertiary-50 dark:bg-tertiary-900/20">
                <Crown className="h-5 w-5 text-tertiary-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">Subscription Credits</p>
                  <p className="text-sm text-slate-500">Apply credits toward your monthly subscription</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="glass-card rounded-2xl p-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No transactions yet. Purchase or earn credits to see them here.</p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx: any) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center gap-3">
                    <div className={cn('h-10 w-10 rounded-lg flex items-center justify-center', tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-rose-100 text-rose-600')}>
                      {tx.amount > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-900 dark:text-white">{TYPE_LABELS[tx.type] || tx.type}</p>
                      <p className="text-sm text-slate-500">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <p className={cn('font-semibold', tx.amount > 0 ? 'text-green-600' : 'text-rose-600')}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purchase Modal */}
        {showPurchaseModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="glass-card rounded-2xl p-6 w-full max-w-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-white">Buy Bucr Credits</h3>
                <button onClick={() => setShowPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                <CreditCard className="inline h-4 w-4 mr-1" />
                1 credit = ₦100 (flat rate)
              </p>

              {/* Package Selection */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {CREDIT_PACKAGES.map((pkg) => (
                  <button
                    key={pkg.credits}
                    onClick={() => { setSelectedPackage(pkg.credits); setCustomCredits(''); }}
                    className={cn(
                      'relative p-4 rounded-xl border-2 transition-all text-left',
                      selectedPackage === pkg.credits
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    )}
                  >
                    {pkg.popular && (
                      <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-xs px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{pkg.credits}</p>
                    <p className="text-sm text-slate-500">credits</p>
                    <p className="text-sm font-medium text-primary-600 mt-1">{formatCurrency(pkg.credits * 100)}</p>
                  </button>
                ))}
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Or enter custom amount (min 10)
                </label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Enter credits"
                    value={customCredits}
                    onChange={(e) => { setCustomCredits(e.target.value); setSelectedPackage(null); }}
                    min={10}
                    className="flex-1"
                  />
                  {customCredits && parseInt(customCredits) >= 10 && (
                    <div className="flex items-center px-3 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm">
                      = {formatCurrency(parseInt(customCredits) * 100)}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary */}
              {(selectedPackage || (customCredits && parseInt(customCredits) >= 10)) && (
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Credits</span>
                    <span className="font-medium">{selectedPackage || parseInt(customCredits)}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-500">Rate</span>
                    <span className="font-medium">₦100/credit</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2 flex justify-between">
                    <span className="font-medium">Total</span>
                    <span className="font-bold text-lg text-primary-600">
                      {formatCurrency((selectedPackage || parseInt(customCredits)) * 100)}
                    </span>
                  </div>
                </div>
              )}

              <Button
                onClick={handlePurchase}
                className="w-full btn-primary"
                disabled={purchaseMutation.isPending || (!selectedPackage && (!customCredits || parseInt(customCredits) < 10))}
              >
                {purchaseMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</>
                ) : (
                  <><CreditCard className="h-4 w-4 mr-2" />Pay with Paystack</>
                )}
              </Button>

              <p className="text-xs text-slate-400 text-center mt-3">
                Secure payment via Paystack. Card, Bank Transfer, USSD supported.
              </p>
            </div>
          </div>
        )}

        {/* Verifying Payment Overlay */}
        {isVerifying && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="glass-card rounded-2xl p-8 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-slate-900 dark:text-white">Verifying payment...</p>
              <p className="text-sm text-slate-500">Please wait while we confirm your purchase</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
