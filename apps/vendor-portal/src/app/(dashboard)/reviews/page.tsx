'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { reviewsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Star,
  MessageSquare,
  TrendingUp,
  ThumbsUp,
  Flag,
  Reply,
  Filter,
  ChevronDown,
  X,
  Loader2,
  Send,
} from 'lucide-react';

interface Review {
  id: string;
  user: { name: string; avatar?: string };
  rating: number;
  comment: string;
  createdAt: string;
  response?: string;
  helpful: number;
}

export default function ReviewsPage() {
  const [filter, setFilter] = useState<number | undefined>(undefined);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['reviews', filter],
    queryFn: () => reviewsApi.getAll({ rating: filter }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['reviews-stats'],
    queryFn: () => reviewsApi.getStats(),
  });

  // Handle both paginated response (data.data.reviews) and direct response formats
  const reviewsData = (data?.data as any)?.reviews || (Array.isArray(data?.data) ? data.data : []);
  const reviews: Review[] = reviewsData.map((r: any) => ({
    id: r.id,
    user: r.user || { name: 'Anonymous' },
    rating: r.rating,
    comment: r.text,
    createdAt: r.createdAt,
    response: r.vendorResponse,
    helpful: 0,
  }));
  
  // Map API stats response to component expected format
  const apiStats = statsData?.data || {};
  const stats = {
    average: apiStats.averageRating || 0,
    total: apiStats.totalReviews || 0,
    fiveStar: apiStats.ratingDistribution?.[5] || 0,
    fourStar: apiStats.ratingDistribution?.[4] || 0,
    threeStar: apiStats.ratingDistribution?.[3] || 0,
    twoStar: apiStats.ratingDistribution?.[2] || 0,
    oneStar: apiStats.ratingDistribution?.[1] || 0,
  };

  // Respond to review mutation
  const respondMutation = useMutation({
    mutationFn: ({ reviewId, response }: { reviewId: string; response: string }) => 
      reviewsApi.respond(reviewId, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      toast.success('Response sent successfully');
      setReplyingTo(null);
      setReplyText('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send response');
    },
  });

  // Report review mutation
  const reportMutation = useMutation({
    mutationFn: ({ reviewId, reason }: { reviewId: string; reason: string }) => 
      reviewsApi.report(reviewId, reason),
    onSuccess: () => {
      toast.success('Review reported successfully');
      setReportingId(null);
      setReportReason('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to report review');
    },
  });

  const handleReply = useCallback((reviewId: string) => {
    if (!replyText.trim()) return;
    respondMutation.mutate({ reviewId, response: replyText });
  }, [replyText, respondMutation]);

  const handleReport = useCallback((reviewId: string) => {
    if (!reportReason.trim()) return;
    reportMutation.mutate({ reviewId, reason: reportReason });
  }, [reportReason, reportMutation]);

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
      />
    ));
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-lg shadow-amber-500/30">
              <Star className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Reviews</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage customer feedback & ratings</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Overall Rating Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-6 lg:col-span-1"
          >
            <div className="text-center">
              <div className="text-5xl font-bold text-slate-900 dark:text-white mb-2">{stats.average}</div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {renderStars(Math.round(stats.average))}
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">Based on {stats.total} reviews</p>
            </div>

            {/* Rating Breakdown */}
            <div className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats[`${['one', 'two', 'three', 'four', 'five'][star - 1]}Star` as keyof typeof stats] || 0;
                const percentage = stats.total ? (Number(count) / stats.total) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-4">{star}</span>
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    <div className="flex-1 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-slate-500 dark:text-slate-400 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-6 lg:col-span-2"
          >
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Review Insights</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <MessageSquare className="h-6 w-6 text-primary-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Reviews</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <TrendingUp className="h-6 w-6 text-emerald-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.fiveStar + stats.fourStar}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">5-4 Star</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <Reply className="h-6 w-6 text-tertiary-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{reviews.filter((r: any) => r.response).length}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Responded</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                <ThumbsUp className="h-6 w-6 text-amber-500 mb-2" />
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total > 0 ? Math.round(((stats.fiveStar + stats.fourStar) / stats.total) * 100) : 0}%</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Positive</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Reviews List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-2xl"
        >
          <div className="px-6 py-5 border-b border-slate-200/50 dark:border-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Reviews</h2>
          </div>

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
                <Star className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">No reviews yet</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Reviews will appear after verified visits</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200/50 dark:divide-slate-800/50">
              {reviews.map((review: any, index: number) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-6"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 text-sm font-bold text-slate-600 dark:text-slate-300">
                      {review.user?.name?.charAt(0) || 'G'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{review.user?.name || 'Guest'}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex items-center gap-0.5">
                              {renderStars(review.rating)}
                            </div>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              {formatDate(review.createdAt)}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="text-slate-400" onClick={() => setReportingId(review.id)}>
                          <Flag className="h-4 w-4" />
                        </Button>
                      </div>

                      <p className="mt-3 text-slate-600 dark:text-slate-300">{review.comment}</p>

                      {/* Response */}
                      {review.response && (
                        <div className="mt-4 p-4 rounded-xl bg-primary-50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20">
                          <p className="text-sm font-medium text-primary-700 dark:text-primary-400 mb-1">Your Response</p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">{review.response}</p>
                        </div>
                      )}

                      {/* Reply Form */}
                      {replyingTo === review.id && (
                        <div className="mt-4 flex gap-2">
                          <Input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Write your response..."
                            className="flex-1 h-11 rounded-xl"
                          />
                          <Button 
                            onClick={() => handleReply(review.id)} 
                            disabled={respondMutation.isPending || !replyText.trim()}
                            className="btn-gradient"
                          >
                            {respondMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          </Button>
                          <Button variant="outline" onClick={() => { setReplyingTo(null); setReplyText(''); }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-4 mt-4">
                        <button className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                          <ThumbsUp className="h-4 w-4" />
                          Helpful ({review.helpful})
                        </button>
                        {!review.response && replyingTo !== review.id && (
                          <button 
                            onClick={() => { setReplyingTo(review.id); setReplyText(''); }}
                            className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
                          >
                            <Reply className="h-4 w-4" />
                            Reply
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {reportingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setReportingId(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Report Review</h3>
                <button onClick={() => setReportingId(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Please provide a reason for reporting this review.
              </p>
              <textarea
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                rows={3}
                placeholder="Reason for reporting..."
              />
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setReportingId(null)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleReport(reportingId)} 
                  className="flex-1"
                  disabled={reportMutation.isPending || !reportReason.trim()}
                >
                  {reportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Report
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
