'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ordersApi } from '@/lib/api';
import { formatCurrency, formatDate, cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  ShoppingBag, Search, ChevronLeft, ChevronRight,
  Eye, MapPin, Phone, Clock, Package,
} from 'lucide-react';

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  preparing: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  ready: 'bg-tertiary-100 text-tertiary-800 dark:bg-tertiary-900/30 dark:text-tertiary-400',
  out_for_delivery: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  completed: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const orderTypes: Record<string, string> = {
  pickup: 'Pickup',
  delivery: 'Delivery',
};

export default function OrdersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [orderType, setOrderType] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status, orderType],
    queryFn: () => ordersApi.getAll({ page, search, status, type: orderType }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.updateStatus(id, status),
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || { page: 1, totalPages: 1, total: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Orders</h1>
          <p className="text-slate-500 mt-1">Manage all takeout and delivery orders</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <ShoppingBag className="w-4 h-4" />
          <span>{pagination.total} total orders</span>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by order ID, user, or vendor..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="preparing">Preparing</option>
            <option value="ready">Ready</option>
            <option value="out_for_delivery">Out for Delivery</option>
            <option value="delivered">Delivered</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={orderType}
            onChange={(e) => { setOrderType(e.target.value); setPage(1); }}
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">All Types</option>
            <option value="pickup">Pickup</option>
            <option value="delivery">Delivery</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No orders found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Order</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">User</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Vendor</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Type</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Items</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Total</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-4 text-right text-xs font-medium text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orders.map((order: any) => (
                  <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-mono text-sm font-medium text-slate-900 dark:text-white">
                          #{order.orderNumber}
                        </p>
                        <p className="text-xs text-slate-500">{formatDate(order.createdAt)}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {order.user?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {order.user?.phone || order.contactPhone}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white">
                          {order.branch?.vendor?.businessName || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.branch?.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2 py-1 rounded-lg text-xs font-medium',
                        order.orderType === 'delivery' 
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                          : 'bg-tertiary-100 text-tertiary-700 dark:bg-tertiary-900/30 dark:text-tertiary-400'
                      )}>
                        {orderTypes[order.orderType] || order.orderType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Package className="w-4 h-4 text-slate-400" />
                        <span className="text-sm">{order.items?.length || 0} items</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {formatCurrency(order.totalAmount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium',
                        statusColors[order.status] || statusColors.pending
                      )}>
                        {order.status?.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-sm text-slate-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Order #{selectedOrder.orderNumber}</h3>
            
            <div className="space-y-4">
              {/* Order Info */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">User</span>
                  <span>{selectedOrder.user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vendor</span>
                  <span>{selectedOrder.branch?.vendor?.businessName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Type</span>
                  <span>{orderTypes[selectedOrder.orderType]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className={cn(
                    'px-2 py-0.5 rounded-full text-xs',
                    statusColors[selectedOrder.status]
                  )}>
                    {selectedOrder.status?.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              {/* Items */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <h4 className="font-medium mb-2">Items</h4>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-sm">
                      <span>{item.quantity}x {item.menuItem?.name || item.name}</span>
                      <span>{formatCurrency(item.totalPrice)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Subtotal</span>
                  <span>{formatCurrency(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.deliveryFee > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Delivery Fee</span>
                    <span>{formatCurrency(selectedOrder.deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium text-base">
                  <span>Total</span>
                  <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                </div>
              </div>

              {/* Delivery Address */}
              {selectedOrder.orderType === 'delivery' && selectedOrder.deliveryAddress && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="font-medium mb-2">Delivery Address</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedOrder.deliveryAddress}
                  </p>
                </div>
              )}

              {/* Update Status */}
              {!['completed', 'cancelled'].includes(selectedOrder.status) && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <h4 className="font-medium mb-2">Update Status</h4>
                  <select
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                    value={selectedOrder.status}
                    onChange={(e) => {
                      updateStatusMutation.mutate({ id: selectedOrder.id, status: e.target.value });
                      setSelectedOrder({ ...selectedOrder, status: e.target.value });
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    {selectedOrder.orderType === 'delivery' && (
                      <option value="out_for_delivery">Out for Delivery</option>
                    )}
                    <option value="delivered">Delivered</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            <Button variant="outline" className="w-full mt-6" onClick={() => setSelectedOrder(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
