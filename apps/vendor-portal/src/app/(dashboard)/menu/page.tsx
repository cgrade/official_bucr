'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { menuApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Edit2,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ImageIcon,
  DollarSign,
  X,
  Flame,
  Leaf,
  Loader2,
  Upload,
  Clock,
  ChevronDown,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  category: string;
  image?: string;
  isAvailable: boolean;
  isSpicy?: boolean;
  isVegetarian?: boolean;
  availableForDineIn?: boolean;
  availableForTakeout?: boolean;
}

// Categories will be fetched from the API

const initialFormState = {
  name: '',
  description: '',
  price: '',
  categoryId: '',
  isSpicy: false,
  isVegetarian: false,
  isAvailable: true,
  availableForDineIn: true,
  availableForTakeout: true,
  image: '',
};

export default function MenuPage() {
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [formData, setFormData] = useState(initialFormState);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isSuccess } = useQuery({
    queryKey: ['menu'],
    queryFn: () => menuApi.getItems(),
  });

  // Extract categories and items from the API response
  const apiCategories = data?.data?.categories || [];

  // Auto-seed default categories if vendor has none
  const [seedingCategories, setSeedingCategories] = useState(false);
  useEffect(() => {
    const seedCategories = async () => {
      if (isSuccess && apiCategories.length === 0 && !seedingCategories) {
        setSeedingCategories(true);
        try {
          const result = await menuApi.seedDefaultCategories();
          if (result?.data?.seeded) {
            toast.success('Default menu categories created!');
            queryClient.invalidateQueries({ queryKey: ['menu'] });
          }
        } catch (error) {
          console.error('Failed to seed categories:', error);
        } finally {
          setSeedingCategories(false);
        }
      }
    };
    seedCategories();
  }, [isSuccess, apiCategories.length, seedingCategories, queryClient]);
  const uncategorizedItems = data?.data?.uncategorizedItems || [];
  
  // Build categories list for filter tabs
  const categories = [
    { id: 'all', name: 'All Items' },
    ...apiCategories.map((cat: any) => ({ id: cat.id, name: cat.name })),
    ...(uncategorizedItems.length > 0 ? [{ id: 'uncategorized', name: 'Uncategorized' }] : []),
  ];
  
  // Flatten all menu items from categories + uncategorized (with categoryId for filtering)
  const allMenuItems = [
    ...apiCategories.flatMap((cat: any) => (cat.items || []).map((item: any) => ({ 
      ...item, 
      category: cat.name,
      categoryId: cat.id 
    }))),
    ...uncategorizedItems.map((item: any) => ({ ...item, category: 'Uncategorized', categoryId: null })),
  ];
  
  // Filter by active category - simple filter by categoryId
  const menuItems = activeCategory === 'all' 
    ? allMenuItems 
    : activeCategory === 'uncategorized'
      ? allMenuItems.filter((item: any) => !item.categoryId)
      : allMenuItems.filter((item: any) => item.categoryId === activeCategory);

  // Filter by search - memoized for performance
  const filteredItems = useMemo(() => {
    if (!search.trim()) return menuItems;
    const searchLower = search.toLowerCase();
    return menuItems.filter((item: any) =>
      item.name?.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }, [menuItems, search]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => menuApi.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item created successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create item');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => menuApi.updateItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item updated successfully');
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update item');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => menuApi.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Menu item deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete item');
    },
  });

  // Availability toggle — uses the dedicated /availability endpoint
  const [eightySixMenu, setEightySixMenu] = useState<string | null>(null); // item id whose 86-menu is open

  const availabilityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof menuApi.updateAvailability>[1] }) =>
      menuApi.updateAvailability(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Availability updated');
      setEightySixMenu(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    },
  });

  // Legacy toggle kept for backward compat (still works via /menu/:id PATCH)
  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      menuApi.updateAvailability(id, { isAvailable }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu'] });
      toast.success('Availability updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update availability');
    },
  });

  const openCreateModal = useCallback(() => {
    setEditingItem(null);
    setFormData(initialFormState);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price?.toString() || '',
      categoryId: (item as any).categoryId || '',
      isSpicy: item.isSpicy || false,
      isVegetarian: item.isVegetarian || false,
      isAvailable: item.isAvailable,
      availableForDineIn: item.availableForDineIn ?? true,
      availableForTakeout: item.availableForTakeout ?? true,
      image: item.image || '',
    });
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setEditingItem(null);
    setFormData(initialFormState);
  }, []);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadingImage(true);
    
    try {
      const uploadFormData = new FormData();
      uploadFormData.append('image', file);
      
      const response = await menuApi.uploadImage(uploadFormData);
      setFormData(prev => ({ ...prev, image: response.data?.url || '' }));
      toast.success('Image uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      description: formData.description,
      price: formData.price ? parseInt(formData.price) : 0,
      categoryId: formData.categoryId || undefined,
      isAvailable: formData.isAvailable,
      availableForDineIn: formData.availableForDineIn,
      availableForTakeout: formData.availableForTakeout,
      image: formData.image || undefined,
    };

    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }, [formData, editingItem, createMutation, updateMutation]);

  const handleToggleAvailability = useCallback((item: MenuItem) => {
    toggleMutation.mutate({ id: item.id, isAvailable: !item.isAvailable });
  }, [toggleMutation]);

  const handle86 = useCallback((itemId: string, preset: string) => {
    let unavailableUntil: string | null;
    if (preset === 'clear') {
      unavailableUntil = null;
    } else if (preset === '2h') {
      unavailableUntil = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    } else if (preset === '4h') {
      unavailableUntil = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
    } else { // end_of_service
      const eod = new Date();
      eod.setHours(23, 59, 0, 0);
      unavailableUntil = eod.toISOString();
    }
    availabilityMutation.mutate({ id: itemId, payload: { unavailableUntil } });
  }, [availabilityMutation]);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] shadow-lg shadow-rose-500/30">
              <UtensilsCrossed className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Menu Management</h1>
              <p className="text-sm text-[#7a8fa6]">Manage your restaurant menu items</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
              <Input
                placeholder="Search menu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 pl-10 h-11 rounded-xl bg-[rgba(255,255,255,0.05)] border-0"
              />
            </div>
            <Button className="btn-gradient gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add Item
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                activeCategory === cat.id
                  ? 'bg-[#c9a84c] text-white shadow-lg shadow-tertiary-500/30'
                  : 'bg-[rgba(255,255,255,0.05)] text-slate-600 text-[#7a8fa6] hover:bg-slate-200 hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Menu Items Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : filteredItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-64 flex-col items-center justify-center glass-card rounded-2xl"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.05)] mb-4">
              <UtensilsCrossed className="h-8 w-8 text-[#7a8fa6]" />
            </div>
            <p className="text-[#7a8fa6] font-medium">No menu items found</p>
            <p className="text-sm text-[#7a8fa6] text-[rgba(122,143,166,0.7)] mt-1">Add your first menu item to get started</p>
            <Button className="btn-gradient mt-4 gap-2" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              Add First Item
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item: any, index: number) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card rounded-2xl overflow-hidden group"
              >
                {/* Image */}
                <div className="relative h-40 bg-[rgba(255,255,255,0.06)] dark: dark:">
                  {item.image ? (
                    <img 
                      src={item.image.startsWith('http') ? item.image : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${item.image}`} 
                      alt={item.name} 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <ImageIcon className="h-12 w-12 text-[#7a8fa6]" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex gap-2">
                    {item.isSpicy && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/90 text-white text-xs font-medium">
                        <Flame className="h-3 w-3" />
                        Spicy
                      </span>
                    )}
                    {item.isVegetarian && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-medium">
                        <Leaf className="h-3 w-3" />
                        Veg
                      </span>
                    )}
                  </div>

                  {/* Actions Overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => openEditModal(item)}>
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDeleteConfirm(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-[#f5f0e8] line-clamp-1">{item.name}</h3>
                      <p className="text-sm text-[#7a8fa6] line-clamp-2 mt-1">
                        {item.description || 'No description'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
                    {item.price ? (
                      <span className="flex items-center gap-1 text-lg font-bold text-[#f5f0e8]">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        {formatCurrency(item.price)}
                      </span>
                    ) : (
                      <span className="text-sm text-[#7a8fa6]">Dine-in only</span>
                    )}

                    <div className="flex items-center gap-1">
                      {/* 86-temporarily dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setEightySixMenu(eightySixMenu === item.id ? null : item.id)}
                          className="p-2 rounded-lg text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                          title="86 temporarily"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                        {eightySixMenu === item.id && (
                          <div className="absolute right-0 bottom-full mb-1 z-20 w-44 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(201,168,76,0.18)] shadow-xl overflow-hidden">
                            <p className="px-3 py-2 text-xs font-semibold text-[#7a8fa6] border-b border-[rgba(201,168,76,0.1)]">
                              Mark unavailable for…
                            </p>
                            {[
                              { label: '2 hours',          value: '2h' },
                              { label: '4 hours',          value: '4h' },
                              { label: 'End of service',   value: 'end_of_service' },
                              { label: 'Clear 86 window',  value: 'clear' },
                            ].map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => handle86(item.id, opt.value)}
                                disabled={availabilityMutation.isPending}
                                className="w-full text-left px-3 py-2 text-sm text-slate-700 text-[rgba(245,240,232,0.7)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* On/off toggle */}
                      <button
                        onClick={() => handleToggleAvailability(item)}
                        disabled={toggleMutation.isPending}
                        className={`p-2 rounded-lg transition-colors ${
                          item.isAvailable
                            ? 'text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20'
                            : 'text-[#7a8fa6] bg-[rgba(255,255,255,0.05)] hover:bg-slate-200 hover:bg-[rgba(255,255,255,0.06)]'
                        }`}
                        title={item.isAvailable ? 'Mark unavailable' : 'Mark available'}
                      >
                        {item.isAvailable ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg glass-card rounded-2xl p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[#f5f0e8]">
                  {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-[rgba(255,255,255,0.06)] rounded-lg">
                  <X className="h-5 w-5 text-[#7a8fa6]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="mt-1.5 h-11 rounded-xl"
                    placeholder="e.g., Jollof Rice Special"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="mt-1.5 w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    rows={3}
                    placeholder="Describe your dish..."
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Dish Image</label>
                  <div className="mt-1.5 flex items-center gap-4">
                    <div className="h-20 w-20 rounded-xl bg-[rgba(255,255,255,0.05)] flex items-center justify-center overflow-hidden">
                      {formData.image ? (
                        <img 
                          src={formData.image.startsWith('http') ? formData.image : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${formData.image}`} 
                          alt="Preview" 
                          className="w-full h-full object-cover" 
                        />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-[#7a8fa6]" />
                      )}
                    </div>
                    <div>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <Button 
                        type="button"
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => imageInputRef.current?.click()}
                        disabled={uploadingImage}
                      >
                        {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {uploadingImage ? 'Uploading...' : 'Upload Image'}
                      </Button>
                      <p className="text-xs text-[#7a8fa6] mt-1">PNG, JPG up to 5MB</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Price (₦)</label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="mt-1.5 h-11 rounded-xl"
                      placeholder="Leave empty for dine-in"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 text-[rgba(245,240,232,0.7)]">Category</label>
                    {showNewCategory ? (
                      <div className="mt-1.5 flex gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Category name"
                          className="h-11 rounded-xl flex-1"
                        />
                        <Button
                          type="button"
                          size="sm"
                          className="h-11"
                          disabled={!newCategoryName.trim() || creatingCategory}
                          onClick={async () => {
                            if (!newCategoryName.trim()) return;
                            setCreatingCategory(true);
                            try {
                              const result = await menuApi.createCategory({ name: newCategoryName.trim() });
                              if (result.success) {
                                toast.success('Category created');
                                setFormData({ ...formData, categoryId: result.data.id });
                                queryClient.invalidateQueries({ queryKey: ['menu'] });
                                setNewCategoryName('');
                                setShowNewCategory(false);
                              }
                            } catch (e) {
                              toast.error('Failed to create category');
                            } finally {
                              setCreatingCategory(false);
                            }
                          }}
                        >
                          {creatingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                        </Button>
                        <Button type="button" size="sm" variant="ghost" className="h-11" onClick={() => { setShowNewCategory(false); setNewCategoryName(''); }}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-1.5 flex gap-2">
                        <select
                          value={formData.categoryId}
                          onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                          className="flex-1 h-11 rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                          <option value="">No category (Uncategorized)</option>
                          {apiCategories.map((cat: any) => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                          ))}
                        </select>
                        <Button type="button" size="sm" variant="outline" className="h-11" onClick={() => setShowNewCategory(true)}>
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isSpicy}
                      onChange={(e) => setFormData({ ...formData, isSpicy: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <Flame className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-slate-600 text-[#7a8fa6]">Spicy</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isVegetarian}
                      onChange={(e) => setFormData({ ...formData, isVegetarian: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <Leaf className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm text-slate-600 text-[#7a8fa6]">Vegetarian</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isAvailable}
                      onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                      className="rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600 text-[#7a8fa6]">Available</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={closeModal} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" className="btn-gradient flex-1" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingItem ? 'Save Changes' : 'Create Item'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass-card rounded-2xl p-6 text-center"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/20 mx-auto mb-4">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-[#f5f0e8] mb-2">Delete Menu Item?</h3>
              <p className="text-sm text-[#7a8fa6] mb-6">
                This action cannot be undone. The item will be permanently removed.
              </p>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(deleteConfirm)} 
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
