'use client';

import { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  Eye, EyeOff, ArrowRight, ArrowLeft, Check, Upload,
  Building2, User, MapPin, FileText, Loader2, X,
  CheckCircle, AlertCircle, XCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

// Mapbox GL is browser-only — load it client-side
const MapPicker = dynamic(() => import('@/components/ui/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-64 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// Step 1: Owner Details
const ownerSchema = z.object({
  ownerName: z.string().min(2, 'Name must be at least 2 characters'),
  ownerEmail: z.string().email('Please enter a valid email'),
  ownerPhone: z.string().regex(
    /^(\+234|0)[789][01]\d{8}$/,
    'Enter valid Nigerian phone (e.g., 08012345678 or +2348012345678)'
  ),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const BUSINESS_TYPES = [
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'bar',        label: 'Bar' },
  { value: 'cafe',       label: 'Café' },
  { value: 'lounge',     label: 'Lounge' },
  { value: 'hotel',      label: 'Hotel Restaurant' },
  { value: 'club',       label: 'Club / Night Club' },
  { value: 'bakery',     label: 'Bakery' },
  { value: 'food_truck', label: 'Food Truck' },
  { value: 'catering',   label: 'Catering' },
  { value: 'other',      label: 'Other' },
];

// Venue type sets the default booking DEPOSIT (the per-cover success fee is a flat
// ₦1,500 across all venue types). You can override the deposit later in Settings.
// Values match the VenueType enum in the database exactly.
const VENUE_TYPES = [
  { value: 'fine_dining',    label: 'Fine Dining',    description: 'Premium tasting menus, high-end service · ₦20,000 deposit/booking' },
  { value: 'upscale_casual', label: 'Upscale Casual', description: 'Quality dining without strict formality · ₦15,000 deposit/booking' },
  { value: 'lounge',         label: 'Lounge',         description: 'Relaxed atmosphere, drinks & light bites · ₦10,000 deposit/booking' },
  { value: 'casual',         label: 'Casual Dining',  description: 'Everyday dining, accessible pricing · ₦10,000 deposit/booking' },
];

// Step 2: Business Details
const businessSchema = z.object({
  businessType: z.string().min(1, 'Please select your business type'),
  venueType:    z.string().min(1, 'Please select your venue type'),
  businessName: z.string().min(2, 'Business name is required'),
  description:  z.string().optional(),
  cuisineTypes: z.string().optional(),
});

// Step 3: Location Details
const locationSchema = z.object({
  address: z.string().min(5, 'Address is required'),
  country: z.string().min(2, 'Country is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  branchPhone: z.string()
    .regex(/^(\+234|0)[789][01]\d{8}$/, 'Enter valid Nigerian phone')
    .optional()
    .or(z.literal('')),
  branchEmail: z.string().email('Enter valid email').optional().or(z.literal('')),
});

type OwnerFormData = z.infer<typeof ownerSchema>;
type BusinessFormData = z.infer<typeof businessSchema>;
type LocationFormData = z.infer<typeof locationSchema>;

interface DocumentUpload {
  type: 'cac' | 'owner_id';
  file: File | null;
  preview: string | null;
  uploading: boolean;
  uploaded: boolean;
  error: string | null;
}

const steps = [
  { id: 1, name: 'Owner Details', icon: User },
  { id: 2, name: 'Business Info', icon: Building2 },
  { id: 3, name: 'Location', icon: MapPin },
  { id: 4, name: 'Documents', icon: FileText },
];

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [consentGiven, setConsentGiven] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  // Form data storage
  const [ownerData, setOwnerData] = useState<OwnerFormData | null>(null);
  const [businessData, setBusinessData] = useState<BusinessFormData | null>(null);
  const [locationData, setLocationData] = useState<LocationFormData | null>(null);
  
  // Document uploads
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: 'cac', file: null, preview: null, uploading: false, uploaded: false, error: null },
    { type: 'owner_id', file: null, preview: null, uploading: false, uploaded: false, error: null },
  ]);

  // Form hooks for each step
  const ownerForm = useForm<OwnerFormData>({
    resolver: zodResolver(ownerSchema),
    defaultValues: ownerData || {},
  });

  const businessForm = useForm<BusinessFormData>({
    resolver: zodResolver(businessSchema),
    defaultValues: businessData || {},
  });

  const locationForm = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: locationData || { country: 'Nigeria' },
  });

  const handleOwnerSubmit = (data: OwnerFormData) => {
    setOwnerData(data);
    setCurrentStep(2);
  };

  const handleBusinessSubmit = (data: BusinessFormData) => {
    setBusinessData(data);
    setCurrentStep(3);
  };

  const handleLocationSubmit = (data: LocationFormData) => {
    setLocationData(data);
    setCurrentStep(4);
  };

  const handleFileSelect = useCallback((type: 'cac' | 'owner_id', file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or PDF file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    // Create preview for images
    let preview: string | null = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    setDocuments(prev => prev.map(doc => 
      doc.type === type 
        ? { ...doc, file, preview, error: null }
        : doc
    ));
  }, []);

  const removeFile = (type: 'cac' | 'owner_id') => {
    setDocuments(prev => prev.map(doc => 
      doc.type === type 
        ? { ...doc, file: null, preview: null, uploaded: false, error: null }
        : doc
    ));
  };

  const handleFinalSubmit = async () => {
    if (!ownerData || !businessData || !locationData) {
      const missing = [];
      if (!ownerData) missing.push('Owner details');
      if (!businessData) missing.push('Business info');
      if (!locationData) missing.push('Location');
      toast.error(`Please complete: ${missing.join(', ')}`);
      return;
    }

    if (!consentGiven) {
      setRegistrationError('Please agree to the Terms of Service and Privacy Policy to continue');
      return;
    }

    // Check required documents
    const cacDoc = documents.find(d => d.type === 'cac');
    const ownerIdDoc = documents.find(d => d.type === 'owner_id');

    if (!cacDoc?.file) {
      toast.error('CAC Certificate is required');
      return;
    }

    if (!ownerIdDoc?.file) {
      toast.error("Owner's ID is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Register the vendor
      // Filter out empty optional fields to avoid validation errors
      const registrationData: Record<string, any> = {
        ownerName: ownerData.ownerName,
        ownerEmail: ownerData.ownerEmail,
        ownerPhone: ownerData.ownerPhone,
        password: ownerData.password,
        businessName: businessData.businessName,
        address: locationData.address,
        country: locationData.country || 'Nigeria',
        city: locationData.city,
        state: locationData.state,
      };

      // Seed the diner-facing price level from the chosen venue type
      // (vendor can fine-tune it later in Settings).
      const PRICE_BY_VENUE: Record<string, number> = {
        fine_dining: 4, upscale_casual: 3, lounge: 2, casual: 1,
      };
      if (businessData.venueType && PRICE_BY_VENUE[businessData.venueType]) {
        registrationData.priceLevel = PRICE_BY_VENUE[businessData.venueType];
      }

      // Only add optional fields if they have values
      if (businessData.description?.trim()) {
        registrationData.description = businessData.description.trim();
      }
      if (businessData.businessType) {
        registrationData.businessType = businessData.businessType;
      }
      if (businessData.venueType) {
        registrationData.venueType = businessData.venueType;
      }
      if (businessData.cuisineTypes?.trim()) {
        registrationData.cuisineTypes = businessData.cuisineTypes.split(',').map(c => c.trim()).filter(Boolean);
      }
      if (locationData.branchPhone?.trim()) {
        registrationData.branchPhone = locationData.branchPhone.trim();
      }
      if (locationData.branchEmail?.trim()) {
        registrationData.branchEmail = locationData.branchEmail.trim();
      }
      // Pinned map coordinates (the backend auto-geocodes the address if absent).
      if (coords) {
        registrationData.latitude = coords.lat;
        registrationData.longitude = coords.lng;
      }

      let registerResponse;
      let registerResult;

      try {
        registerResponse = await fetch(`${API_URL}/api/auth/vendor/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData),
        });

        const responseText = await registerResponse.text();
        try {
          registerResult = JSON.parse(responseText);
        } catch {
          throw new Error(`Server returned an invalid response: ${responseText.substring(0, 200)}`);
        }
      } catch (fetchError: any) {
        throw new Error(`Network error: ${fetchError.message}. Please check your connection and try again.`);
      }

      if (!registerResponse.ok) {
        // Handle validation errors from API
        let errorMessage = '';
        
        if (registerResult.errors && Array.isArray(registerResult.errors)) {
          errorMessage = registerResult.errors.join(', ');
        } else if (registerResult.error) {
          errorMessage = registerResult.error;
        } else if (registerResult.message) {
          errorMessage = registerResult.message;
        } else {
          errorMessage = `Registration failed (Status: ${registerResponse.status})`;
        }
        
        throw new Error(errorMessage);
      }

      const { tokens } = registerResult.data;

      // Step 2: Upload documents
      const uploadErrors: string[] = [];
      for (const doc of documents) {
        if (doc.file) {
          setDocuments(prev => prev.map(d => 
            d.type === doc.type ? { ...d, uploading: true } : d
          ));

          try {
            // Convert file to base64
            const base64 = await fileToBase64(doc.file);
            
            // Upload to server
            const uploadResponse = await fetch(`${API_URL}/api/upload`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.accessToken}`,
              },
              body: JSON.stringify({
                file: base64,
                folder: 'documents',
                filename: doc.file.name,
              }),
            });

            const uploadResult = await uploadResponse.json();

            if (!uploadResponse.ok) {
              throw new Error(uploadResult.message || 'Upload failed');
            }

            // Save document reference
            await fetch(`${API_URL}/api/vendor/documents`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${tokens.accessToken}`,
              },
              body: JSON.stringify({
                type: doc.type,
                fileUrl: uploadResult.data.url,
                fileName: doc.file.name,
              }),
            });

            setDocuments(prev => prev.map(d => 
              d.type === doc.type ? { ...d, uploading: false, uploaded: true } : d
            ));
          } catch (uploadError: any) {
            console.error(`Upload error for ${doc.type}:`, uploadError);
            uploadErrors.push(`${doc.type}: ${uploadError.message}`);
            setDocuments(prev => prev.map(d => 
              d.type === doc.type 
                ? { ...d, uploading: false, error: uploadError.message } 
                : d
            ));
          }
        }
      }

      // Registration succeeded - redirect even if uploads failed
      if (uploadErrors.length > 0) {
        toast.warning('Account created! Document upload failed - please upload documents after logging in.', { duration: 6000 });
      } else {
        toast.success('Registration successful! Please wait for document verification.');
      }
      router.push('/login?registered=true');
    } catch (error: any) {
      console.error('Registration error:', error);
      const errorMsg = error.message || 'Registration failed. Please try again.';
      setRegistrationError(errorMsg);
      toast.error(errorMsg, { duration: 10000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-2/5 relative overflow-hidden">
        <div className="absolute inset-0 bg-[rgba(255,255,255,0.06)] " />
        
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <BucrWordmark height={40} />
            <span className="text-sm text-[#7a8fa6] ml-2">Vendor Portal</span>
          </motion.div>
          
          {/* Progress Steps */}
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Join Bucr Today</h2>
            <p className="text-[#7a8fa6]">Complete these steps to register your restaurant</p>
            
            <div className="space-y-4 mt-8">
              {steps.map((step, index) => {
                const StepIcon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                
                return (
                  <motion.div
                    key={step.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl transition-all',
                      isCurrent && 'bg-white/10 border border-[rgba(201,168,76,0.2)]',
                      isCompleted && 'opacity-60'
                    )}
                  >
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      isCompleted && 'bg-green-500',
                      isCurrent && 'bg-[#0f2547]',
                      !isCompleted && !isCurrent && 'bg-slate-700'
                    )}>
                      {isCompleted ? (
                        <Check className="h-5 w-5 text-white" />
                      ) : (
                        <StepIcon className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className={cn(
                        'font-medium',
                        isCurrent ? 'text-white' : 'text-[#7a8fa6]'
                      )}>
                        {step.name}
                      </p>
                      <p className="text-sm text-[#7a8fa6]">Step {step.id} of 4</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
          
          {/* Footer */}
          <p className="text-sm text-[#7a8fa6]">
            © 2026 Bucr. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex w-full lg:w-3/5 flex-col items-center justify-center p-6 md:p-8 bg-[rgba(255,255,255,0.04)] overflow-y-auto">
        <div className="w-full max-w-xl">
          {/* Mobile Progress */}
          <div className="mb-6 lg:hidden">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium',
                    currentStep > step.id && 'bg-green-500 text-white',
                    currentStep === step.id && 'bg-primary-500 text-white',
                    currentStep < step.id && 'bg-slate-200 bg-[rgba(255,255,255,0.04)] text-[#7a8fa6]'
                  )}>
                    {currentStep > step.id ? <Check className="h-4 w-4" /> : step.id}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={cn(
                      'h-1 w-8 mx-1',
                      currentStep > step.id ? 'bg-green-500' : 'bg-slate-200 bg-[rgba(255,255,255,0.04)]'
                    )} />
                  )}
                </div>
              ))}
            </div>
            <p className="text-center text-sm text-[#7a8fa6]">
              Step {currentStep}: {steps[currentStep - 1].name}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Owner Details */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-3xl p-8"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                  Owner Details
                </h2>
                <p className="text-[#7a8fa6] mb-6">
                  Tell us about the business owner
                </p>

                <form onSubmit={ownerForm.handleSubmit(handleOwnerSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Full Name *
                    </label>
                    <Input
                      placeholder="John Doe"
                      error={ownerForm.formState.errors.ownerName?.message}
                      {...ownerForm.register('ownerName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Email Address *
                    </label>
                    <Input
                      type="email"
                      placeholder="owner@restaurant.com"
                      error={ownerForm.formState.errors.ownerEmail?.message}
                      {...ownerForm.register('ownerEmail')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Phone Number *
                    </label>
                    <Input
                      placeholder="+234 800 000 0000"
                      error={ownerForm.formState.errors.ownerPhone?.message}
                      {...ownerForm.register('ownerPhone')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Password *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={ownerForm.formState.errors.password?.message}
                        {...ownerForm.register('password')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8fa6] hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                    <PasswordStrength value={ownerForm.watch('password') || ''} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        error={ownerForm.formState.errors.confirmPassword?.message}
                        {...ownerForm.register('confirmPassword')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8fa6] hover:text-slate-600"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full btn-gradient">
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-[#7a8fa6]">
                  Already have an account?{' '}
                  <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500">
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}

            {/* Step 2: Business Details */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-3xl p-8"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                  Business Information
                </h2>
                <p className="text-[#7a8fa6] mb-6">
                  Tell us about your business
                </p>

                <form onSubmit={businessForm.handleSubmit(handleBusinessSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Business Type *
                    </label>
                    <select
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.04)] text-[#f5f0e8] focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      {...businessForm.register('businessType')}
                    >
                      <option value="">Select business type...</option>
                      {BUSINESS_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {businessForm.formState.errors.businessType && (
                      <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.businessType.message}</p>
                    )}
                  </div>

                  {/* Venue Type — determines per-cover pricing tier */}
                  <div>
                    <label className="block text-sm font-medium text-[#7a8fa6] mb-2">
                      Venue Type * <span className="text-[10px] text-[rgba(122,143,166,0.6)] font-normal">(sets your default booking deposit)</span>
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      {VENUE_TYPES.map((v) => {
                        const selected = businessForm.watch('venueType') === v.value;
                        return (
                          <label key={v.value}
                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                              selected
                                ? 'border-[#c9a84c] bg-[rgba(201,168,76,0.08)]'
                                : 'border-[rgba(201,168,76,0.15)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(201,168,76,0.3)]'
                            }`}>
                            <input type="radio" value={v.value} {...businessForm.register('venueType')} className="mt-1 accent-[#c9a84c]" />
                            <div>
                              <p className={`text-[13px] font-semibold ${selected ? 'text-[#c9a84c]' : 'text-[#f5f0e8]'}`}>{v.label}</p>
                              <p className="text-[11px] text-[#7a8fa6]">{v.description}</p>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                    {businessForm.formState.errors.venueType && (
                      <p className="mt-1 text-xs text-red-500">{businessForm.formState.errors.venueType.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Business Name *
                    </label>
                    <Input
                      placeholder="The Great Kitchen"
                      error={businessForm.formState.errors.businessName?.message}
                      {...businessForm.register('businessName')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Description
                    </label>
                    <textarea
                      placeholder="Tell customers about your restaurant..."
                      className="w-full px-4 py-3 rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.04)] text-[#f5f0e8] focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                      rows={3}
                      {...businessForm.register('description')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Cuisine Types
                    </label>
                    <Input
                      placeholder="Nigerian, Continental, Chinese (comma separated)"
                      {...businessForm.register('cuisineTypes')}
                    />
                    <p className="mt-1 text-xs text-[#7a8fa6]">Separate multiple cuisines with commas</p>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 btn-gradient">
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-3xl p-8"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                  Location Details
                </h2>
                <p className="text-[#7a8fa6] mb-6">
                  Where is your main branch located?
                </p>

                <form onSubmit={locationForm.handleSubmit(handleLocationSubmit)} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Street Address *
                    </label>
                    <Input
                      placeholder="123 Restaurant Street"
                      error={locationForm.formState.errors.address?.message}
                      {...locationForm.register('address')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#7a8fa6] mb-2">
                      Country *
                    </label>
                    <select
                      {...locationForm.register('country')}
                      className="w-full rounded-xl border border-[rgba(201,168,76,0.18)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[#f5f0e8] focus:border-[#c9a84c] focus:outline-none focus:ring-2 focus:ring-[rgba(201,168,76,0.2)]"
                    >
                      <option value="Nigeria">Nigeria</option>
                      <option value="Ghana">Ghana</option>
                      <option value="Kenya">Kenya</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                        City *
                      </label>
                      <Input
                        placeholder="Lagos"
                        error={locationForm.formState.errors.city?.message}
                        {...locationForm.register('city')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                        State *
                      </label>
                      <Input
                        placeholder="Lagos"
                        error={locationForm.formState.errors.state?.message}
                        {...locationForm.register('state')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Branch Phone (optional)
                    </label>
                    <Input
                      placeholder="+234 800 000 0000"
                      {...locationForm.register('branchPhone')}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 text-[#7a8fa6] mb-2">
                      Branch Email (optional)
                    </label>
                    <Input
                      type="email"
                      placeholder="branch@restaurant.com"
                      {...locationForm.register('branchEmail')}
                    />
                  </div>

                  {/* Map: pin your exact location so guests can find + get directions */}
                  <div>
                    <label className="block text-sm font-medium text-[#7a8fa6] mb-2">
                      Pin your location on the map
                      {coords
                        ? <span className="ml-2 text-[10px] text-[#22c55e] font-medium">✓ Location set</span>
                        : <span className="ml-2 text-[10px] text-[rgba(122,143,166,0.6)]">(search your address, then drag the pin to be exact)</span>}
                    </label>
                    <MapPicker
                      address={locationForm.watch('address')}
                      lat={coords?.lat}
                      lng={coords?.lng}
                      onChange={({ lat, lng, formattedAddress }) => {
                        setCoords({ lat, lng });
                        if (formattedAddress && !locationForm.getValues('address')) {
                          locationForm.setValue('address', formattedAddress);
                        }
                      }}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 btn-gradient">
                      Continue
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step 4: Documents */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass-card rounded-3xl p-8"
              >
                <h2 className="text-2xl font-bold text-[#f5f0e8] mb-2">
                  Verification Documents
                </h2>
                <p className="text-[#7a8fa6] mb-6">
                  Upload required documents for verification
                </p>

                <div className="space-y-6">
                  {/* CAC Certificate */}
                  <DocumentUploadCard
                    title="CAC Certificate"
                    description="Corporate Affairs Commission registration certificate"
                    required
                    document={documents.find(d => d.type === 'cac')!}
                    onFileSelect={(file) => handleFileSelect('cac', file)}
                    onRemove={() => removeFile('cac')}
                  />

                  {/* Owner ID */}
                  <DocumentUploadCard
                    title="Owner's Valid ID"
                    description="National ID, Driver's License, or International Passport"
                    required
                    document={documents.find(d => d.type === 'owner_id')!}
                    onFileSelect={(file) => handleFileSelect('owner_id', file)}
                    onRemove={() => removeFile('owner_id')}
                  />

                  <div className="bg-[#c9a84c]/5 dark:bg-[#c9a84c]/10 border border-[#c9a84c]/30 dark:border-[#c9a84c]/20 rounded-xl p-4">
                    <div className="flex gap-3">
                      <AlertCircle className="h-5 w-5 text-[#a07830] dark:text-[#e8d49a] flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-[#a07830] dark:text-[#e8d49a]">
                          Document Review
                        </p>
                        <p className="text-sm text-[#a07830] dark:text-[#e8d49a] mt-1">
                          Your documents will be reviewed by our team within 24-48 hours. 
                          You&apos;ll receive an email once your account is verified.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* NDPA consent */}
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentGiven}
                      onChange={(e) => setConsentGiven(e.target.checked)}
                      className="mt-1 h-4 w-4 accent-[#c9a84c]"
                    />
                    <span className="text-xs text-[#7a8fa6] leading-relaxed">
                      I agree to Bucr&apos;s{' '}
                      <Link href="/terms" className="text-[#c9a84c] hover:underline">Terms of Service</Link>
                      {' '}and{' '}
                      <Link href="/privacy" className="text-[#c9a84c] hover:underline">Privacy Policy</Link>
                      , and confirm I&apos;m authorised to register this business. Data is processed per the Nigeria Data Protection Act 2023.
                    </span>
                  </label>

                  {/* Error Display */}
                  {registrationError && (
                    <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                      <div className="flex items-start gap-3">
                        <XCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-800 dark:text-red-400">
                            Registration Failed
                          </p>
                          <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {registrationError}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" onClick={goBack} className="flex-1">
                      <ArrowLeft className="mr-2 h-5 w-5" />
                      Back
                    </Button>
                    <Button
                      onClick={() => { setRegistrationError(null); handleFinalSubmit(); }}
                      className="flex-1 btn-gradient"
                      disabled={isSubmitting || !consentGiven}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Registering...
                        </>
                      ) : (
                        <>
                          Complete Registration
                          <Check className="ml-2 h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Live password strength meter + requirements checklist (mirrors backend rules).
function PasswordStrength({ value }: { value: string }) {
  const checks = {
    'At least 8 characters': value.length >= 8,
    'One uppercase letter': /[A-Z]/.test(value),
    'One lowercase letter': /[a-z]/.test(value),
    'One number': /[0-9]/.test(value),
  };
  const score = Object.values(checks).filter(Boolean).length;
  const meta =
    score <= 1 ? { label: 'Weak', color: '#ef4444', pct: 25 }
    : score === 2 ? { label: 'Fair', color: '#f59e0b', pct: 50 }
    : score === 3 ? { label: 'Good', color: '#f59e0b', pct: 75 }
    : { label: 'Strong', color: '#22c55e', pct: 100 };

  if (!value) {
    return <p className="mt-1 text-xs text-[#7a8fa6]">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>;
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-[rgba(255,255,255,0.1)] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${meta.pct}%`, backgroundColor: meta.color }} />
        </div>
        <span className="text-[11px] font-semibold w-12 text-right" style={{ color: meta.color }}>{meta.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {Object.entries(checks).map(([label, ok]) => (
          <li key={label} className="flex items-center gap-1.5 text-[11px]" style={{ color: ok ? '#22c55e' : '#7a8fa6' }}>
            {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Document Upload Card Component
interface DocumentUploadCardProps {
  title: string;
  description: string;
  required?: boolean;
  document: DocumentUpload;
  onFileSelect: (file: File) => void;
  onRemove: () => void;
}

function DocumentUploadCard({ 
  title, 
  description, 
  required, 
  document, 
  onFileSelect, 
  onRemove 
}: DocumentUploadCardProps) {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file);
  };

  return (
    <div className="border border-[rgba(201,168,76,0.18)] rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-[#f5f0e8]">
            {title}
            {required && <span className="text-red-500 ml-1">*</span>}
          </h3>
          <p className="text-sm text-[#7a8fa6]">{description}</p>
        </div>
        {document.uploaded && (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>

      {document.file ? (
        <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.04)] rounded-lg">
          {document.preview ? (
            <img 
              src={document.preview} 
              alt="Preview" 
              className="h-12 w-12 object-cover rounded-lg"
            />
          ) : (
            <div className="h-12 w-12 flex items-center justify-center bg-slate-200 bg-[rgba(255,255,255,0.04)] rounded-lg">
              <FileText className="h-6 w-6 text-[#7a8fa6]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#f5f0e8] truncate">
              {document.file.name}
            </p>
            <p className="text-xs text-[#7a8fa6]">
              {(document.file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          {document.uploading ? (
            <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
          ) : (
            <button
              onClick={onRemove}
              className="p-1 hover:bg-slate-200 hover:bg-[rgba(255,255,255,0.06)] rounded"
            >
              <X className="h-5 w-5 text-[#7a8fa6]" />
            </button>
          )}
        </div>
      ) : (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-[rgba(201,168,76,0.18)] rounded-xl cursor-pointer hover:border-primary-500 dark:hover:border-primary-400 transition-colors"
        >
          <Upload className="h-8 w-8 text-[#7a8fa6] mb-2" />
          <p className="text-sm text-slate-600 text-[#7a8fa6] text-center">
            <span className="font-medium text-primary-600 dark:text-primary-400">Click to upload</span>
            {' '}or drag and drop
          </p>
          <p className="text-xs text-[#7a8fa6] mt-1">PNG, JPG or PDF (max 5MB)</p>
          <input
            type="file"
            className="hidden"
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleChange}
          />
        </label>
      )}

      {document.error && (
        <p className="mt-2 text-sm text-red-500">{document.error}</p>
      )}
    </div>
  );
}
