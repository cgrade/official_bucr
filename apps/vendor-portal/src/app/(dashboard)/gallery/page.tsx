'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { galleryApi } from '@/lib/api';
import { toast } from 'sonner';
import {
  ImageIcon,
  Plus,
  Trash2,
  Star,
  Upload,
  Grid,
  LayoutGrid,
  Eye,
  X,
  Loader2,
  Edit2,
} from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  isFeatured: boolean;
}

export default function GalleryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'large'>('grid');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [editingCaption, setEditingCaption] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [newImageCaption, setNewImageCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['gallery'],
    queryFn: () => galleryApi.getAll(),
  });

  const images: GalleryImage[] = Array.isArray(data?.data) ? data.data : [];

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (formData: FormData) => galleryApi.upload(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Image uploaded successfully');
      setNewImageCaption('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to upload image');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => galleryApi.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Image updated successfully');
      setEditingCaption(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update image');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => galleryApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Image deleted successfully');
      setDeleteConfirm(null);
      setSelectedImage(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete image');
    },
  });

  // Set featured mutation
  const featureMutation = useMutation({
    mutationFn: (id: string) => galleryApi.setFeatured(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gallery'] });
      toast.success('Featured image updated');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to set featured image');
    },
  });

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('image', files[0]);
      if (newImageCaption) {
        formData.append('caption', newImageCaption);
      }
      uploadMutation.mutate(formData);
    }
    e.target.value = '';
  }, [newImageCaption, uploadMutation]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleSaveCaption = useCallback((id: string) => {
    updateMutation.mutate({ id, payload: { caption: captionValue } });
  }, [captionValue, updateMutation]);

  const handleToggleFeatured = useCallback((image: GalleryImage) => {
    if (!image.isFeatured) {
      featureMutation.mutate(image.id);
    }
  }, [featureMutation]);

  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  const openEditCaption = useCallback((image: GalleryImage) => {
    setEditingCaption(image.id);
    setCaptionValue(image.caption || '');
  }, []);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 glass-card border-b border-[rgba(201,168,76,0.18)] dark:border-[rgba(201,168,76,0.12)]">
        <div className="flex h-20 items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.04)] shadow-lg shadow-indigo-500/30">
              <ImageIcon className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">Gallery</h1>
              <p className="text-sm text-[#7a8fa6]">Manage your restaurant photos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 p-1 rounded-xl bg-[rgba(255,255,255,0.05)]">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-[rgba(255,255,255,0.03)] shadow-sm' : 'text-[#7a8fa6]'
                }`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('large')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'large' ? 'bg-[rgba(255,255,255,0.03)] shadow-sm' : 'text-[#7a8fa6]'
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            <Button className="btn-gradient gap-2" onClick={handleUploadClick} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadMutation.isPending ? 'Uploading...' : 'Upload Photo'}
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 p-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0f2547]">
                <ImageIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#7a8fa6]">Total Photos</p>
                <p className="text-2xl font-bold text-[#f5f0e8]">{images.length}</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.06)]">
                <Star className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#7a8fa6]">Featured</p>
                <p className="text-2xl font-bold text-[#f5f0e8]">
                  {images.filter((i: any) => i.isFeatured).length}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card rounded-2xl p-5"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600">
                <Eye className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-[#7a8fa6]">Total Views</p>
                <p className="text-2xl font-bold text-[#f5f0e8]">0</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Gallery Grid */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
          </div>
        ) : images.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex h-64 flex-col items-center justify-center glass-card rounded-2xl"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(255,255,255,0.05)] mb-4">
              <ImageIcon className="h-8 w-8 text-[#7a8fa6]" />
            </div>
            <p className="text-[#7a8fa6] font-medium">No photos yet</p>
            <p className="text-sm text-[#7a8fa6] text-[rgba(122,143,166,0.7)] mt-1">Upload photos to showcase your restaurant</p>
            <Button className="btn-gradient mt-4 gap-2" onClick={handleUploadClick} disabled={uploadMutation.isPending}>
              {uploadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploadMutation.isPending ? 'Uploading...' : 'Upload First Photo'}
            </Button>
          </motion.div>
        ) : (
          <div className={`grid gap-4 ${
            viewMode === 'grid' 
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' 
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          }`}>
            {images.map((image: any, index: number) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative group rounded-2xl overflow-hidden bg-slate-200 bg-[#1a3c6e] ${
                  viewMode === 'grid' ? 'aspect-square' : 'aspect-video'
                }`}
              >
                {/* Actual image */}
                {image.url ? (
                  <img 
                    src={image.url.startsWith('http') ? image.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${image.url}`} 
                    alt={image.caption || 'Gallery image'} 
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgba(255,255,255,0.06)] dark: dark:">
                    <ImageIcon className="h-12 w-12 text-[#7a8fa6]" />
                  </div>
                )}

                {/* Featured Badge */}
                {image.isFeatured && (
                  <div className="absolute top-3 left-3">
                    <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#c9a84c]/90 text-[#070f1e] text-xs font-medium">
                      <Star className="h-3 w-3" />
                      Featured
                    </span>
                  </div>
                )}

                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col items-center justify-center gap-3">
                  <p className="text-white font-medium text-center px-4">{image.caption || 'No caption'}</p>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => setSelectedImage(image)}>
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button size="sm" variant="secondary" className="gap-1" onClick={() => handleToggleFeatured(image)}>
                      <Star className={`h-4 w-4 ${image.isFeatured ? 'fill-[#c9a84c] text-[#c9a84c]' : ''}`} />
                    </Button>
                    <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDeleteConfirm(image.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add More Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: images.length * 0.05 }}
              onClick={handleUploadClick}
              disabled={uploadMutation.isPending}
              className={`rounded-2xl border-2 border-dashed border-[rgba(201,168,76,0.18)] flex flex-col items-center justify-center gap-2 text-[#7a8fa6] hover:text-slate-600 hover:text-[#f5f0e8] hover:border-slate-400 dark:hover:border-slate-600 transition-colors ${
                viewMode === 'grid' ? 'aspect-square' : 'aspect-video'
              }`}
            >
              {uploadMutation.isPending ? <Loader2 className="h-8 w-8 animate-spin" /> : <Plus className="h-8 w-8" />}
              <span className="text-sm font-medium">{uploadMutation.isPending ? 'Uploading...' : 'Add More'}</span>
            </motion.button>
          </div>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl glass-card rounded-2xl overflow-hidden"
            >
              <div className="relative aspect-video bg-slate-200 bg-[#1a3c6e] flex items-center justify-center">
                {selectedImage.url ? (
                  <img 
                    src={selectedImage.url.startsWith('http') ? selectedImage.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${selectedImage.url}`} 
                    alt={selectedImage.caption || 'Gallery image'} 
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <ImageIcon className="h-24 w-24 text-[#7a8fa6]" />
                )}
              </div>
              <div className="p-6">
                {editingCaption === selectedImage.id ? (
                  <div className="flex gap-2">
                    <Input
                      value={captionValue}
                      onChange={(e) => setCaptionValue(e.target.value)}
                      className="flex-1 h-11 rounded-xl"
                      placeholder="Enter caption..."
                    />
                    <Button onClick={() => handleSaveCaption(selectedImage.id)} disabled={updateMutation.isPending}>
                      {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingCaption(null)}>Cancel</Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-medium text-[#f5f0e8]">
                      {selectedImage.caption || 'No caption'}
                    </p>
                    <Button variant="ghost" size="sm" onClick={() => openEditCaption(selectedImage)}>
                      <Edit2 className="h-4 w-4 mr-1" /> Edit
                    </Button>
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleToggleFeatured(selectedImage)}
                    disabled={featureMutation.isPending}
                  >
                    <Star className={`h-4 w-4 mr-2 ${selectedImage.isFeatured ? 'fill-[#c9a84c] text-[#c9a84c]' : ''}`} />
                    {selectedImage.isFeatured ? 'Featured' : 'Set as Featured'}
                  </Button>
                  <Button variant="destructive" onClick={() => setDeleteConfirm(selectedImage.id)}>
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                </div>
              </div>
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
              <h3 className="text-lg font-semibold text-[#f5f0e8] mb-2">Delete Photo?</h3>
              <p className="text-sm text-[#7a8fa6] mb-6">
                This action cannot be undone. The photo will be permanently removed.
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
