'use client';
import FeatureGate from '@/components/ui/FeatureGate';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { experiencesApi, galleryApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  Sparkles,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
  Clock,
  Users,
  CreditCard,
  Calendar,
  Upload,
  Image as ImageIcon,
} from 'lucide-react';

const EXPERIENCE_TYPES = [
  { value: 'tasting_menu', label: 'Tasting Menu' },
  { value: 'wine_pairing', label: 'Wine Pairing' },
  { value: 'cooking_class', label: 'Cooking Class' },
  { value: 'private_dining', label: 'Private Dining' },
  { value: 'chef_table', label: "Chef's Table" },
  { value: 'brunch', label: 'Special Brunch' },
  { value: 'live_music', label: 'Live Music Night' },
  { value: 'other', label: 'Other' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const initialFormState = {
  title: '',
  description: '',
  type: 'tasting_menu',
  creditsRequired: 100,
  capacity: 10,
  duration: 120,
  availableDays: [] as number[],
  startTime: '19:00',
  endTime: '22:00',
  images: [] as string[],
  isActive: true,
};

function ExperiencesPageInner() {
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: () => experiencesApi.getAll(),
  });

  const experiences = data?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => experiencesApi.create(data),
    onSuccess: () => {
      toast.success('Experience created!');
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeModal();
    },
    onError: (error: any) => toast.error(error.response?.data?.error || 'Failed to create experience'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => experiencesApi.update(id, data),
    onSuccess: () => {
      toast.success('Experience updated!');
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      closeModal();
    },
    onError: () => toast.error('Failed to update experience'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => experiencesApi.delete(id),
    onSuccess: () => {
      toast.success('Experience deleted');
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      setDeleteConfirm(null);
    },
    onError: () => toast.error('Failed to delete experience'),
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
      type: item.type || 'tasting_menu',
      creditsRequired: item.creditsRequired || 100,
      capacity: item.capacity || 10,
      duration: item.duration || 120,
      availableDays: item.availableDays || [],
      startTime: item.startTime || '19:00',
      endTime: item.endTime || '22:00',
      images: item.images || [],
      isActive: item.isActive ?? true,
    });
    setEditingItem(item);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      creditsRequired: Number(formData.creditsRequired),
      capacity: Number(formData.capacity),
      duration: Number(formData.duration),
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleDay = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter((d) => d !== day)
        : [...prev.availableDays, day],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('image', file);
      formDataUpload.append('category', 'experience');
      const result = await galleryApi.upload(formDataUpload);
      if (result?.data?.url) {
        setFormData((prev) => ({
          ...prev,
          images: [...prev.images, result.data.url],
        }));
        toast.success('Image uploaded');
      }
    } catch (error) {
      toast.error('Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1d3a]">
      <header className="sticky top-0 z-10 bg-[#0f2547] border-b border-[rgba(201,168,76,0.18)]">
        <div className="px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#c9a84c] shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Experiences</h1>
              <p className="text-[#7a8fa6]">Create special dining experiences</p>
            </div>
          </div>
          <Button onClick={openCreateModal} className="btn-gradient gap-2">
            <Plus className="h-4 w-4" /> Add Experience
          </Button>
        </div>
      </header>

      <div className="p-8">
        {experiences.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-medium text-[#f5f0e8] mb-2">No experiences yet</h3>
            <p className="text-[#7a8fa6] mb-4">Create your first special dining experience</p>
            <Button onClick={openCreateModal} className="btn-gradient">
              <Plus className="h-4 w-4 mr-2" /> Create Experience
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {experiences.map((exp: any) => (
              <motion.div
                key={exp.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl overflow-hidden"
              >
                {exp.images?.[0] && (
                  <img src={exp.images[0]} alt={exp.title} className="w-full h-40 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#f5f0e8]">{exp.title}</h3>
                      <span className="text-xs px-2 py-1 rounded-full bg-tertiary-100 dark:bg-tertiary-900/30 text-tertiary-600 dark:text-tertiary-400">
                        {EXPERIENCE_TYPES.find((t) => t.value === exp.type)?.label || exp.type}
                      </span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${exp.isActive ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-[#7a8fa6]'}`}>
                      {exp.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {exp.description && (
                    <p className="text-sm text-slate-600 text-[#7a8fa6] mb-4 line-clamp-2">{exp.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-sm text-[#7a8fa6] mb-4">
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4" />
                      <span>{exp.creditsRequired} credits</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>Up to {exp.capacity}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{exp.duration} mins</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      <span>{exp.availableDays?.map((d: number) => DAYS[d]).join(', ') || 'Any'}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditModal(exp)} className="flex-1">
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(exp.id)} className="text-red-500 hover:bg-red-50">
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
              className="bg-[rgba(255,255,255,0.03)] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="p-6 border-b border-[rgba(201,168,76,0.18)] flex items-center justify-between">
                <h2 className="text-lg font-semibold">{editingItem ? 'Edit Experience' : 'New Experience'}</h2>
                <button onClick={closeModal} className="p-2 hover:bg-[rgba(255,255,255,0.06)] rounded-lg">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Title *</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Chef's Table Experience"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe the experience..."
                    className="w-full rounded-lg border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full rounded-lg border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-sm"
                    >
                      {EXPERIENCE_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Credits Required *</label>
                    <Input
                      type="number"
                      value={formData.creditsRequired}
                      onChange={(e) => setFormData({ ...formData, creditsRequired: Number(e.target.value) })}
                      min={1}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Capacity</label>
                    <Input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({ ...formData, capacity: Number(e.target.value) })}
                      min={1}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                    <Input
                      type="number"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                      min={30}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Available Days</label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS.map((day, index) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDay(index)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          formData.availableDays.includes(index)
                            ? 'bg-tertiary-500 text-white'
                            : 'bg-[rgba(255,255,255,0.05)] text-slate-600 text-[#7a8fa6]'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Start Time</label>
                    <Input
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">End Time</label>
                    <Input
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Images</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.images.map((img, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden">
                        <img src={img} alt="" className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          className="absolute top-1 right-1 p-1 bg-red-500 rounded-full text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <label className="w-20 h-20 rounded-lg border-2 border-dashed border-[rgba(201,168,76,0.18)] flex items-center justify-center cursor-pointer hover:bg-[rgba(255,255,255,0.04)]">
                      {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-[#7a8fa6]" />}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  </div>
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
              className="bg-[rgba(255,255,255,0.03)] rounded-2xl p-6 max-w-sm w-full"
            >
              <h3 className="text-lg font-semibold mb-2">Delete Experience?</h3>
              <p className="text-[#7a8fa6] mb-4">This action cannot be undone.</p>
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

export default function ExperiencesPage() { return <FeatureGate feature="experiences"><ExperiencesPageInner /></FeatureGate>; }
