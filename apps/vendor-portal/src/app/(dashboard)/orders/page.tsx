'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ordersApi } from '@/lib/api';
import { formatTime, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ShoppingBag,
  Clock,
  CheckCircle,
  Truck,
  Package,
  ChefHat,
  RefreshCw,
  Bell,
  Phone,
  MapPin,
  ArrowRight,
} from 'lucide-react';

const tabs = [
  { id: 'active', label: 'Active Orders', count: 0 },
  { id: 'completed', label: 'Completed', count: 0 },
];

const statusConfig = {
  PENDING: { label: 'New Order', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Clock, next: 'CONFIRMED', btnText: 'Accept Order', btnClass: 'btn-gradient' },
  CONFIRMED: { label: 'Confirmed', color: 'text-primary-500', bg: 'bg-primary-500/10', border: 'border-primary-500/20', icon: CheckCircle, next: 'PREPARING', btnText: 'Start Preparing', btnClass: 'bg-primary-500 hover:bg-primary-600 text-white' },
  PREPARING: { label: 'Preparing', color: 'text-tertiary-500', bg: 'bg-tertiary-500/10', border: 'border-tertiary-500/20', icon: ChefHat, next: 'READY', btnText: 'Mark Ready', btnClass: 'bg-tertiary-500 hover:bg-tertiary-600 text-white' },
  READY: { label: 'Ready', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: Package, next: 'PICKED_UP', btnText: 'Mark Picked Up', btnClass: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Truck, next: 'DELIVERED', btnText: 'Mark Delivered', btnClass: 'bg-purple-500 hover:bg-purple-600 text-white' },
  PICKED_UP: { label: 'Picked Up', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, next: null, btnText: '', btnClass: '' },
  DELIVERED: { label: 'Delivered', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: CheckCircle, next: null, btnText: '', btnClass: '' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: Clock, next: null, btnText: '', btnClass: '' },
};

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState('active');
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', activeTab],
    queryFn: () =>
      ordersApi.getAll({
        status: activeTab === 'active' ? 'PENDING,CONFIRMED,PREPARING,READY,OUT_FOR_DELIVERY' : 'PICKED_UP,DELIVERED,CANCELLED',
      }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      ordersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order status updated');
    },
    onError: () => {
      toast.error('Failed to update order status');
    },
  });

  const orders = data?.data || [];

  const handleStatusUpdate = (orderId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: orderId, status: newStatus });
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/30">
              <ShoppingBag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage takeout & delivery orders</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
            <button className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              <Bell className="h-5 w-5" />
              {orders.filter((o: any) => o.status === 'PENDING').length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {orders.filter((o: any) => o.status === 'PENDING').length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-tertiary-500 text-white shadow-lg shadow-primary-500/30'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Orders Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : orders.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-64 flex-col items-center justify-center glass-card rounded-2xl"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4">
              <ShoppingBag className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-medium">No {activeTab} orders</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Orders will appear here when customers place them</p>
          </motion.div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {orders.map((order: any, index: number) => {
              const status = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`glass-card rounded-2xl overflow-hidden border ${status.border}`}
                >
                  {/* Status Header */}
                  <div className={`px-5 py-3 ${status.bg} border-b ${status.border}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={`h-5 w-5 ${status.color}`} />
                        <span className={`font-semibold ${status.color}`}>{status.label}</span>
                      </div>
                      <span className="font-mono text-sm font-medium text-slate-600 dark:text-slate-400">
                        {order.reference || `#${order.id?.slice(-6)}`}
                      </span>
                    </div>
                  </div>

                  {/* Order Content */}
                  <div className="p-5 space-y-4">
                    {/* Customer Info */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {order.user?.name || order.user?.fullName || 'Guest Customer'}
                        </p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500 dark:text-slate-400">
                          <Phone className="h-3.5 w-3.5" />
                          {order.user?.phone || 'No phone'}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.orderType === 'DELIVERY' 
                          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400' 
                          : 'bg-tertiary-500/10 text-tertiary-600 dark:text-tertiary-400'
                      }`}>
                        {order.orderType === 'DELIVERY' ? '🚗 Delivery' : '🏃 Pickup'}
                      </span>
                    </div>

                    {/* Order Items Summary */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                        </span>
                        <span className="text-lg font-bold text-slate-900 dark:text-white">
                          {formatCurrency(order.totalAmount || 0)}
                        </span>
                      </div>
                    </div>

                    {/* Delivery Address */}
                    {order.orderType === 'DELIVERY' && order.deliveryAddress && (
                      <div className="flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{order.deliveryAddress}</span>
                      </div>
                    )}

                    {/* Special Instructions */}
                    {order.specialInstructions && (
                      <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
                        <p className="text-sm text-amber-700 dark:text-amber-400">
                          📝 {order.specialInstructions}
                        </p>
                      </div>
                    )}

                    {/* Time */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Clock className="h-3.5 w-3.5" />
                      Ordered {formatTime(order.createdAt)}
                    </div>

                    {/* Action Button */}
                    {status.next && (
                      <Button
                        className={`w-full h-11 rounded-xl font-semibold ${status.btnClass}`}
                        onClick={() => handleStatusUpdate(order.id, status.next!)}
                        loading={updateStatusMutation.isPending}
                      >
                        {status.btnText}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
