'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { documentsApi, settingsApi, api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { 
  FileText, Upload, CheckCircle, Clock, XCircle, 
  Trash2, ExternalLink, AlertTriangle, Loader2, RefreshCw,
  Shield, Building2
} from 'lucide-react';

const DOCUMENT_TYPES = [
  { 
    type: 'cac', 
    title: 'CAC Certificate', 
    description: 'Corporate Affairs Commission registration certificate',
    required: true 
  },
  { 
    type: 'owner_id', 
    title: 'Owner ID', 
    description: 'Government-issued ID (NIN, Passport, or Driver\'s License)',
    required: true 
  },
  { 
    type: 'tin', 
    title: 'Tax Identification Number', 
    description: 'Federal Inland Revenue Service TIN certificate',
    required: false 
  },
  { 
    type: 'food_safety', 
    title: 'Food Safety Certificate', 
    description: 'NAFDAC or State Food Safety certification',
    required: false 
  },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch vendor profile to get verification status
  const { data: profileData } = useQuery({
    queryKey: ['vendor-profile'],
    queryFn: () => settingsApi.getProfile(),
  });

  // Fetch documents
  const { data: docsData, isLoading, error, refetch } = useQuery({
    queryKey: ['vendor-documents'],
    queryFn: () => documentsApi.getAll(),
  });

  // API returns { documents: [...], verificationStatus: '...' }
  const documentsData = (docsData?.data as any)?.documents || docsData?.data || [];
  const vendor = profileData?.data;
  const verificationStatus = (docsData?.data as any)?.verificationStatus || vendor?.verificationStatus || 'pending';

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => documentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-documents'] });
      toast.success('Document deleted');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Failed to delete document');
    },
  });

  // Handle file upload
  const handleFileUpload = useCallback(async (type: string, file: File) => {
    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or PDF file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    setUploadingType(type);
    setUploadError(null);

    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      // Upload to server
      const uploadResponse = await api.post('/upload', {
        file: base64,
        folder: 'documents',
        filename: file.name,
      });

      if (!uploadResponse.data.success) {
        throw new Error(uploadResponse.data.error || 'Upload failed');
      }

      // Save document reference
      await api.post('/vendor/documents', {
        type,
        fileUrl: uploadResponse.data.data.url,
        fileName: file.name,
      });

      queryClient.invalidateQueries({ queryKey: ['vendor-documents'] });
      queryClient.invalidateQueries({ queryKey: ['vendor-profile'] });
      toast.success('Document uploaded successfully');
    } catch (err: any) {
      console.error('Upload error:', err);
      const errorMsg = err.response?.data?.error || err.message || 'Upload failed';
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setUploadingType(null);
    }
  }, [queryClient]);

  const getDocumentForType = (type: string) => {
    // API returns array with { type, document, status, ... } structure
    const docStatus = documentsData.find((d: any) => d.type === type);
    if (docStatus?.document) {
      return { ...docStatus.document, status: docStatus.status };
    }
    return null;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(52,211,153,0.1)] text-emerald-400 border border-[rgba(52,211,153,0.2)]">
            <CheckCircle className="h-3.5 w-3.5" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(248,113,113,0.1)] text-[#f87171] border border-[rgba(248,113,113,0.2)]">
            <XCircle className="h-3.5 w-3.5" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(201,168,76,0.1)] text-[#c9a84c] border border-[rgba(201,168,76,0.25)]">
            <Clock className="h-3.5 w-3.5" />
            Pending Review
          </span>
        );
    }
  };

  const getVerificationBanner = () => {
    switch (verificationStatus) {
      case 'approved':
        return (
          <div className="p-4 rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[rgba(52,211,153,0.1)] flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-400">Account Verified</p>
                <p className="text-sm text-emerald-400">
                  Your business is verified and visible to customers.
                </p>
              </div>
            </div>
          </div>
        );
      case 'rejected':
        return (
          <div className="p-4 rounded-xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[rgba(248,113,113,0.1)] flex items-center justify-center">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="font-medium text-red-800 dark:text-red-400">Verification Rejected</p>
                <p className="text-sm text-[#f87171]">
                  Some documents were rejected. Please review and re-upload.
                </p>
              </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-4 rounded-xl bg-[rgba(201,168,76,0.08)] border border-[rgba(201,168,76,0.2)]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[rgba(201,168,76,0.1)] flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-400">Verification Pending</p>
                <p className="text-sm text-[#c9a84c]">
                  Your documents are being reviewed. This usually takes 24-48 hours.
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to load documents</h3>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-[rgba(201,168,76,0.1)] flex items-center justify-center">
              <Shield className="h-5 w-5 text-[#c9a84c]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#f5f0e8]">
                KYC Documents
              </h1>
              <p className="text-[#7a8fa6]">
                Manage your business verification documents
              </p>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        {getVerificationBanner()}

        {/* Upload Error Alert */}
        {uploadError && (
          <div className="p-4 rounded-xl bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-800 dark:text-red-400">Upload Failed</p>
                <p className="text-sm text-[#f87171] mt-1">{uploadError}</p>
              </div>
              <button 
                onClick={() => setUploadError(null)} 
                className="ml-auto text-[#f87171]"
              >
                <XCircle className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Documents List */}
        <div className="space-y-4">
          {DOCUMENT_TYPES.map((docType) => {
            const document = getDocumentForType(docType.type);
            const isUploading = uploadingType === docType.type;

            return (
              <div 
                key={docType.type} 
                className="glass-card rounded-xl p-5 border border-[rgba(201,168,76,0.18)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#f5f0e8]">
                        {docType.title}
                      </h3>
                      {docType.required && (
                        <span className="text-xs text-red-500 font-medium">Required</span>
                      )}
                    </div>
                    <p className="text-sm text-[#7a8fa6] mb-3">
                      {docType.description}
                    </p>

                    {document ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          {getStatusBadge(document.status)}
                          <span className="text-xs text-[#7a8fa6]">
                            Uploaded {formatDate(document.createdAt)}
                          </span>
                        </div>

                        {document.rejectionReason && (
                          <div className="p-3 rounded-lg bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)]">
                            <p className="text-sm text-[#f87171]">
                              <strong>Rejection Reason:</strong> {document.rejectionReason}
                            </p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <a
                            href={document.fileUrl?.startsWith('http') ? document.fileUrl : `${API_URL}${document.fileUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-[rgba(201,168,76,0.18)] hover:bg-[rgba(255,255,255,0.04)] transition-colors"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View Document
                          </a>
                          
                          {(document.status === 'rejected' || document.status === 'pending') && (
                            <button
                              onClick={() => deleteMutation.mutate(document.id)}
                              disabled={deleteMutation.isPending}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-[#7a8fa6] italic">No document uploaded</p>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-shrink-0">
                    <label className={`
                      inline-flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer
                      transition-colors
                      ${document && document.status === 'approved'
                        ? 'bg-slate-100 text-[#7a8fa6] bg-[#1a3c6e] cursor-not-allowed'
                        : 'bg-primary-500 text-white hover:bg-primary-600'
                      }
                      ${isUploading ? 'opacity-50 cursor-wait' : ''}
                    `}>
                      {isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm font-medium">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            {document ? 'Replace' : 'Upload'}
                          </span>
                        </>
                      )}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        className="hidden"
                        disabled={isUploading || (document && document.status === 'approved')}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(docType.type, file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Info Card */}
        <div className="glass-card rounded-xl p-5 border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.02)]/50">
          <div className="flex items-start gap-3">
            <Building2 className="h-5 w-5 text-[#7a8fa6] mt-0.5" />
            <div>
              <h4 className="font-medium text-[#f5f0e8] mb-1">
                Why do we need these documents?
              </h4>
              <p className="text-sm text-[#7a8fa6]">
                We verify all vendors to ensure the safety and trust of our platform users. 
                Once verified, your business will be visible to customers and you can start 
                receiving reservations and orders.
              </p>
              <ul className="mt-3 space-y-1 text-sm text-[#7a8fa6]">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  CAC and Owner ID are required for verification
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  TIN and Food Safety certificates are optional but recommended
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Documents are reviewed within 24-48 hours
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
