'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { specialOffersApi, galleryApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Tag,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Upload,
  Percent,
  Calendar,
  Video,
  Image as ImageIcon,
} from 'lucide-react';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage Off' },
  { value: 'fixed', label: 'Fixed Amount Off' },
  { value: 'bogo', label: 'Buy One Get One' },
];

const initialFormState = {
  title: '',
  description: '',
  image: '',
  videoUrl: '',
  discountType: 'percentage' as 'percentage' | 'fixed' | 'bogo',
  discountValue: 10,
  terms: '',
  validFrom: '',
  validUntil: '',
  isActive: true,
};

export default function SpecialOffersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['special-offers'],
    queryFn: () => specialOffersApi.getAll(),
  });

  const offers = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => specialOffersApi.create(data),
    onSuccess: () => {
      toast.success('Special offer created!');
      queryClient.invalidateQueries({ queryKey: ['special-offers'] });
      closeModal();
    },
    onError: () => toast.error('Failed to create offer'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => specialOffersApi.update(id, data),
    onSuccess: () => {
      toast.success('Special offer updated!');
      queryClient.invalidateQueries({ queryKey: ['special-offers'] });
      closeModal();
    },
    onError: () => toast.error('Failed to update offer'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => specialOffersApi.delete(id),
    onSuccess: () => {
      toast.success('Special offer deleted');
      queryClient.invalidateQueries({ queryKey: ['special-offers'] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete offer'),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormState);
  };

  const openCreateModal = () => {
    setFormData(initialFormState);
    setEditingItem(null);
    setShowModal(true);
  };

  const openEditModal = (item: any) => {
    setFormData({
      title: item.title || '',
      description: item.description || '',
      image: item.image || '',
      videoUrl: item.videoUrl || '',
      discountType: item.discountType || 'percentage',
      discountValue: item.discountValue || 10,
      terms: item.terms || '',
      validFrom: item.validFrom ? new Date(item.validFrom).toISOString().split('T')[0] : '',
      validUntil: item.validUntil ? new Date(item.validUntil).toISOString().split('T')[0] : '',
      isActive: item.isActive ?? true,
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      discountValue: formData.discountValue ? Number(formData.discountValue) : undefined,
      validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : undefined,
      validUntil: formData.validUntil ? new Date(formData.validUntil).toISOString() : undefined,
      videoUrl: formData.videoUrl || undefined,
      image: formData.image || undefined,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('category', 'promo');
      const result = await galleryApi.upload(formDataUpload);
      if (result?.data?.url) {
        setFormData((prev) => ({ ...prev, image: result.data.url }));
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const formatDiscount = (offer: any) => {
    if (offer.discountType === 'percentage') return `${offer.discountValue}% Off`;
    if (offer.discountType === 'fixed') return `₦${offer.discountValue?.toLocaleString()} Off`;
    if (offer.discountType === 'bogo') return 'Buy One Get One';
    return '';
  };

  const isExpired = (offer: any) => {
    if (!offer.validUntil) return false;
    return new Date(offer.validUntil) < new Date();
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 shadow-lg">
              <Tag className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Special Offers</h1>
              <p className="text-slate-500 dark:text-slate-400">Create promos and special deals</p>
            </div>
          </div>
          <Button onClick={openCreateModal} className="btn-gradient gap-2">
            <Plus className="h-4 w-4" /> Add Offer
          </Button>
        </div>
      </header>

      <div className="p-8">
        {offers.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">No special offers yet</h3>
            <p className="text-slate-500 mb-4">Create your first promotional offer</p>
            <Button onClick={openCreateModal} className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" /> Create Offer
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offers.map((offer: any) => (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden"
              >
                {offer.image && (
                  <div className="relative">
                    <img src={offer.image} alt={offer.title} className="w-full h-40 object-cover" />
                    {offer.videoUrl && (
                      <div className="absolute bottom-2 right-2 bg-black/60 rounded-full p-2">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white">{offer.title}</h3>
                      {offer.discountType && (
                        <span className="text-lg font-bold text-orange-500">{formatDiscount(offer)}</span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      isExpired(offer) ? 'bg-red-100 text-red-600' :
                      offer.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {isExpired(offer) ? 'Expired' : offer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {offer.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">{offer.description}</p>
                  )}
                  {(offer.validFrom || offer.validUntil) && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                      <Calendar className="h-3 w-3" />
                      <span>
                        {offer.validFrom && new Date(offer.validFrom).toLocaleDateString()}
                        {offer.validFrom && offer.validUntil && ' - '}
                        {offer.validUntil && new Date(offer.validUntil).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {offer.terms && (
                    <p className="text-xs text-slate-400 mb-4 line-clamp-1">Terms: {offer.terms}</p>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(offer)} className="flex-1">
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(offer.id)} className="text-red-500 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingItem ? 'Edit Offer' : 'New Special Offer'}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Weekend Special"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your special offer..."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Discount Type</label>
                    <select
                      value={formData.discountType}
                      onChange={(e) => setFormData({ ...formData, discountType: e.target.value as any })}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    >
                      {DISCOUNT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      {formData.discountType === 'percentage' ? 'Percentage' : formData.discountType === 'fixed' ? 'Amount (₦)' : 'Value'}
                    </label>
                    <Input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) => setFormData({ ...formData, discountValue: Number(e.target.value) })}
                      min={1}
                      max={formData.discountType === 'percentage' ? 100 : undefined}
                      disabled={formData.discountType === 'bogo'}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Valid From</label>
                    <Input
                      type="date"
                      value={formData.validFrom}
                      onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Valid Until</label>
                    <Input
                      type="date"
                      value={formData.validUntil}
                      onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                  <textarea
                    value={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.value })}
                    placeholder="Not valid with other offers. Dine-in only."
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Image</label>
                  {formData.image ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden mb-2">
                      <img src={formData.image} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, image: '' })}
                        className="absolute top-2 right-2 p-1 bg-red-500 rounded-full text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="w-full h-24 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                      {uploadingImage ? (
                        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                      ) : (
                        <div className="text-center">
                          <Upload className="h-6 w-6 mx-auto text-slate-400 mb-1" />
                          <span className="text-sm text-slate-500">Upload image</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Video URL (optional)</label>
                  <Input
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    placeholder="https://youtube.com/watch?v=..."
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm">Active (visible to customers)</label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 btn-gradient" disabled={createMutation.isPending || updateMutation.isPending}>
                    {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {editingItem ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Offer?</h3>
              <p className="text-slate-500 mb-4">This action cannot be undone.</p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">Cancel</Button>
                <Button
                  onClick={() => deleteMutation.mutate(deleteConfirm)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
