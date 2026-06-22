'use client';
import FeatureGate from '@/components/ui/FeatureGate';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { achievementsApi } from '@/lib/api';
import { Award, Lock, Star, Trophy, Medal, Zap, Shield, CheckCircle, BookOpen } from 'lucide-react';

/**
 * Achievements are awarded automatically by the BUCR platform based on real
 * performance data. Vendors cannot create or delete them — this ensures badges
 * on public profiles reflect genuine, verifiable milestones.
 */

const BADGE_ICONS: Record<string, React.ElementType> = {
  top_rated:    Star,
  most_popular: Trophy,
  newcomer:     Zap,
  reliability:  Shield,
  milestone:    Medal,
};

const HOW_EARNED = [
  {
    icon: CheckCircle,
    title: 'Verified Business',
    desc: 'Awarded when your KYC documents are reviewed and approved by the Bucr team.',
    trigger: 'Admin verifies your documents',
  },
  {
    icon: Star,
    title: 'Top Rated',
    desc: 'Awarded when you maintain an average rating of 4.5+ across at least 10 guest reviews.',
    trigger: '≥ 10 reviews · avg rating ≥ 4.5',
  },
  {
    icon: Trophy,
    title: 'Trusted Vendor',
    desc: 'Awarded after reaching 100 completed reservations with a strong show-up record.',
    trigger: '100+ completed bookings',
  },
  {
    icon: Shield,
    title: 'Book With Confidence',
    desc: 'Awarded when your guest check-in rate is 95%+ for 60 consecutive days.',
    trigger: '≥ 95% reliability · sustained 60 days',
  },
  {
    icon: Medal,
    title: 'Premium Partner',
    desc: 'Awarded to Pro and Elite subscribers — recognition of your commitment to the platform.',
    trigger: 'Pro or Elite subscription active',
  },
];

function AchievementsPageInner() {
  const { data, isLoading } = useQuery({
    queryKey: ['achievements'],
    queryFn: () => achievementsApi.getAll(),
  });

  const achievements: any[] = data?.data ?? [];

  return (
    <div className="min-h-screen bg-[#0a1d3a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="flex h-20 items-center gap-4 px-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c]">
            <Award className="h-6 w-6 text-[#0f2547]" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold text-[#f5f0e8]">Achievements</h1>
            <p className="text-[12px] text-[#7a8fa6]">Badges earned automatically based on your performance data</p>
          </div>
        </div>
      </header>

      <div className="p-8 max-w-5xl mx-auto space-y-8">

        {/* How achievements work */}
        <div className="bg-[#0f2547] border border-[rgba(201,168,76,0.18)] rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <BookOpen className="h-5 w-5 text-[#c9a84c]" />
            <h2 className="font-semibold text-[#f5f0e8]">How achievements are awarded</h2>
          </div>
          <p className="text-[13px] text-[#7a8fa6] mb-5 leading-relaxed">
            Bucr badges are awarded automatically by the platform based on verified performance data —
            bookings, reviews, reliability score, and subscription status. They cannot be self-assigned,
            which is what makes them meaningful to guests browsing your profile.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {HOW_EARNED.map(item => {
              const Icon = item.icon;
              const earned = achievements.some(a =>
                a.title.toLowerCase().includes(item.title.toLowerCase().split(' ')[0])
              );
              return (
                <div key={item.title}
                  className={`relative p-4 rounded-xl border transition-all ${
                    earned
                      ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.06)]'
                      : 'border-[rgba(201,168,76,0.12)] bg-[rgba(255,255,255,0.02)]'
                  }`}>
                  {earned && (
                    <span className="absolute top-3 right-3 text-[9px] font-bold tracking-[0.15em] uppercase text-[#c9a84c]">
                      EARNED
                    </span>
                  )}
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${
                    earned ? 'bg-[#c9a84c]' : 'bg-[rgba(201,168,76,0.1)]'
                  }`}>
                    <Icon className={`h-4 w-4 ${earned ? 'text-[#0f2547]' : 'text-[#c9a84c]'}`} />
                  </div>
                  <p className={`font-semibold text-[13px] mb-1 ${earned ? 'text-[#f5f0e8]' : 'text-[rgba(245,240,232,0.55)]'}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-[#7a8fa6] leading-relaxed mb-2">{item.desc}</p>
                  <span className="text-[9px] font-semibold tracking-[0.1em] uppercase text-[rgba(201,168,76,0.5)]">
                    {item.trigger}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Earned achievements */}
        <div>
          <h2 className="font-semibold text-[#f5f0e8] mb-4">
            Your Badges
            {achievements.length > 0 && (
              <span className="ml-2 text-[12px] font-normal text-[#7a8fa6]">({achievements.length} earned)</span>
            )}
          </h2>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-28 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
              ))}
            </div>
          ) : achievements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center bg-[#0f2547] border border-[rgba(201,168,76,0.12)] rounded-xl">
              <Lock className="h-10 w-10 text-[rgba(201,168,76,0.2)] mb-4" />
              <h3 className="font-display text-[18px] font-semibold text-[#f5f0e8] mb-2">No badges yet</h3>
              <p className="text-[13px] text-[#7a8fa6] max-w-sm leading-relaxed">
                Complete bookings, collect reviews, and maintain a high check-in rate.
                Your first badge will appear here automatically when the threshold is reached.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {achievements.map((ach: any, i: number) => {
                const Icon = BADGE_ICONS[ach.badgeType] ?? Award;
                return (
                  <motion.div key={ach.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="bg-[#0f2547] border border-[#c9a84c] rounded-xl p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#c9a84c] text-2xl flex-shrink-0">
                        {ach.icon
                          ? <span>{ach.icon}</span>
                          : <Icon className="h-6 w-6 text-[#0f2547]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[#f5f0e8] text-[15px] leading-tight">{ach.title}</h3>
                        {ach.description && (
                          <p className="text-[12px] text-[#7a8fa6] mt-1 leading-relaxed">{ach.description}</p>
                        )}
                        <div className="flex items-center gap-1.5 mt-2">
                          {ach.badgeType && (
                            <span className="text-[9px] font-bold tracking-[0.12em] uppercase text-[#c9a84c] bg-[rgba(201,168,76,0.1)] px-1.5 py-0.5 rounded">
                              {ach.badgeType.replace(/_/g, ' ')}
                            </span>
                          )}
                          <span className="text-[9px] text-[rgba(122,143,166,0.6)]">
                            · {new Date(ach.earnedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AchievementsPage() {
  return <FeatureGate feature="achievements"><AchievementsPageInner /></FeatureGate>;
}
