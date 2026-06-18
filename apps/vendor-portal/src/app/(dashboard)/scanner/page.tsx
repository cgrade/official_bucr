'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { reservationsApi } from '@/lib/api';
import { formatTime, formatDate, creditsToNaira, formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  Calendar,
  Users,
  Clock,
  CreditCard,
  MapPin,
  RefreshCw,
} from 'lucide-react';

type ScanState = 'idle' | 'scanning' | 'verifying' | 'success' | 'error';

interface VerifiedReservation {
  id: string;
  reference: string;
  reservationTime: string;
  reservationDate: string;
  partySize: number;
  status: string;
  specialRequests?: string;
  creditsDeposited: number;
  user: {
    id: string;
    name?: string;
    fullName?: string;
    email: string;
    phone: string;
  };
  guestProfile?: {
    visitCount?: number;
    totalVisits?: number;
    preferences?: string;
    dietaryRestrictions?: string;
    notes?: string;
  };
}

export default function ScannerPage() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);
  const [reference, setReference] = useState('');
  const [verifiedReservation, setVerifiedReservation] = useState<VerifiedReservation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  // Check for reference in URL params (from dashboard quick action)
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setReference(ref.replace('BKR-', ''));
      handleReferenceVerify(ref);
    }
  }, [searchParams]);

  // Initialize camera (scanning loop runs in useEffect when cameraActive is true — avoids stale closure on setState)
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
        setScanState('scanning');
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera access to scan QR codes.'
          : 'Could not access camera. Please use PIN or reference instead.'
      );
      setCameraActive(false);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScanState('idle');
  }, []);

  useEffect(() => {
    if (!cameraActive) return;

    const scanInterval = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) {
        return;
      }

      const canvas = canvasRef.current;
      const video = videoRef.current;
      const ctx = canvas.getContext('2d');

      if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) return;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);

      try {
        const QrScanner = (await import('qr-scanner')).default;
        const result = await QrScanner.scanImage(canvas, { returnDetailedScanResult: true });

        if (result?.data) {
          clearInterval(scanInterval);
          stopCamera();
          setScanState('verifying');
          setErrorMessage(null);
          void reservationsApi
            .verifyQR(result.data)
            .then((response) => {
              if (response.success) {
                setVerifiedReservation(response.data as VerifiedReservation);
                setScanState('success');
                toast.success('QR code verified!');
              } else {
                setErrorMessage((response as any).error || 'Invalid QR code');
                setScanState('error');
                toast.error('Invalid QR code');
              }
            })
            .catch((error: any) => {
              setErrorMessage(error.response?.data?.error || error.response?.data?.message || 'Invalid QR code');
              setScanState('error');
              toast.error('Invalid QR code');
            });
        }
      } catch {
        // No QR in frame — keep scanning
      }
    }, 400);

    return () => clearInterval(scanInterval);
  }, [cameraActive, stopCamera]);

  const handlePinVerify = async () => {
    const fullPin = pin.join('');
    if (fullPin.length !== 4) {
      toast.error('Please enter a 4-digit PIN');
      return;
    }

    setScanState('verifying');
    setErrorMessage(null);

    try {
      const response = await reservationsApi.verifyPin(fullPin);
      if (response.success) {
        setVerifiedReservation(response.data);
        setScanState('success');
        toast.success('PIN verified!');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || error.response?.data?.message || 'Invalid PIN');
      setScanState('error');
      toast.error('Invalid PIN');
    }
  };

  const handleReferenceVerify = async (ref?: string) => {
    const refToVerify = ref || `BKR-${reference}`;
    if (!refToVerify || refToVerify === 'BKR-') {
      toast.error('Please enter a reference');
      return;
    }

    setScanState('verifying');
    setErrorMessage(null);

    try {
      const response = await reservationsApi.verifyReference(refToVerify);
      if (response.success) {
        setVerifiedReservation(response.data);
        setScanState('success');
        toast.success('Reference verified!');
      }
    } catch (error: any) {
      setErrorMessage(error.response?.data?.error || error.response?.data?.message || 'Invalid reference');
      setScanState('error');
      toast.error('Invalid reference');
    }
  };

  // Check-in handler
  const handleCheckIn = async () => {
    if (!verifiedReservation) return;

    setCheckingIn(true);
    try {
      const response = await reservationsApi.checkIn(verifiedReservation.id);
      if (response.success) {
        toast.success('Check-in successful! Credits refunded to guest.');
        setVerifiedReservation({ ...verifiedReservation, status: 'checked_in' });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Check-in failed');
    } finally {
      setCheckingIn(false);
    }
  };

  // Reset state
  const handleReset = () => {
    setScanState('idle');
    setVerifiedReservation(null);
    setErrorMessage(null);
    setPin(['', '', '', '']);
    setReference('');
    stopCamera();
  };

  // PIN input handler
  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-verify when complete
    if (index === 3 && value) {
      setTimeout(() => handlePinVerify(), 100);
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="flex flex-col">
      <div className="flex-1 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Success State */}
          {scanState === 'success' && verifiedReservation && (
            <Card className="border-success-500">
              <CardHeader className="bg-success-50 border-b border-success-200">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success-500">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-success-700">
                      {verifiedReservation.status === 'checked_in' ? 'Check-in Complete!' : 'Reservation Verified!'}
                    </CardTitle>
                    <p className="text-sm text-success-600">
                      {verifiedReservation.status === 'checked_in' 
                        ? 'Guest has been checked in successfully' 
                        : 'Ready to check in guest'}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {/* Guest Info */}
                <div className="mb-6 rounded-lg bg-gray-50 p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-xl font-semibold text-primary-600">
                      {(verifiedReservation.user.fullName || verifiedReservation.user.name || '?').charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {verifiedReservation.user.fullName || verifiedReservation.user.name || 'Guest'}
                      </h3>
                      <p className="text-sm text-gray-500">{verifiedReservation.user.email}</p>
                      <p className="text-sm text-gray-500">{verifiedReservation.user.phone}</p>
                      {verifiedReservation.guestProfile && (
                        <Badge variant="default" className="mt-2">
                          {(verifiedReservation.guestProfile.visitCount ??
                            verifiedReservation.guestProfile.totalVisits ??
                            0)}{' '}
                          visits
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-medium text-gray-900">
                        {verifiedReservation.reference}
                      </p>
                      <Badge variant={verifiedReservation.status === 'checked_in' ? 'success' : 'default'}>
                        {verifiedReservation.status === 'checked_in' ? 'Checked In' : 'Confirmed'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Reservation Details */}
                <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Date</p>
                      <p className="text-sm font-medium">{formatDate(verifiedReservation.reservationDate)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Time</p>
                      <p className="text-sm font-medium">{formatTime(verifiedReservation.reservationTime)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Party Size</p>
                      <p className="text-sm font-medium">{verifiedReservation.partySize} guests</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Deposit</p>
                      <p className="text-sm font-medium">
                        {verifiedReservation.creditsDeposited} credits
                      </p>
                    </div>
                  </div>
                </div>

                {/* Special Requests / Notes */}
                {(verifiedReservation.specialRequests || verifiedReservation.guestProfile?.notes) && (
                  <div className="mb-6 rounded-lg border border-warning-200 bg-warning-50 p-4">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-warning-700">
                      <AlertTriangle className="h-4 w-4" />
                      Special Notes
                    </h4>
                    <ul className="mt-2 space-y-1 text-sm text-warning-600">
                      {verifiedReservation.specialRequests && (
                        <li>📝 {verifiedReservation.specialRequests}</li>
                      )}
                      {verifiedReservation.guestProfile?.dietaryRestrictions && (
                        <li>🥜 {verifiedReservation.guestProfile.dietaryRestrictions}</li>
                      )}
                      {verifiedReservation.guestProfile?.preferences && (
                        <li>⭐ {verifiedReservation.guestProfile.preferences}</li>
                      )}
                      {verifiedReservation.guestProfile?.notes && (
                        <li>📌 {verifiedReservation.guestProfile.notes}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  {verifiedReservation.status !== 'checked_in' ? (
                    <Button
                      size="xl"
                      variant="success"
                      className="flex-1"
                      onClick={handleCheckIn}
                      loading={checkingIn}
                    >
                      <CheckCircle className="mr-2 h-5 w-5" />
                      Confirm Check-in
                    </Button>
                  ) : (
                    <Button size="xl" variant="outline" className="flex-1" disabled>
                      <CheckCircle className="mr-2 h-5 w-5 text-success-500" />
                      Already Checked In
                    </Button>
                  )}
                  <Button size="xl" variant="outline" onClick={handleReset}>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    New Scan
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {scanState === 'error' && (
            <Card className="border-error-500">
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-100">
                  <XCircle className="h-8 w-8 text-error-500" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900">Verification Failed</h3>
                <p className="mb-6 text-gray-500">{errorMessage || 'Unable to verify reservation'}</p>
                <Button onClick={handleReset}>Try Again</Button>
              </CardContent>
            </Card>
          )}

          {/* Verifying State */}
          {scanState === 'verifying' && (
            <Card>
              <CardContent className="flex flex-col items-center p-8 text-center">
                <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-500 border-t-transparent" />
                <h3 className="text-lg font-semibold text-gray-900">Verifying...</h3>
                <p className="text-gray-500">Please wait while we verify the reservation</p>
              </CardContent>
            </Card>
          )}

          {/* Scanner UI */}
          {(scanState === 'idle' || scanState === 'scanning') && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* QR Scanner */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="h-5 w-5" />
                    Scan QR Code
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-gray-900">
                    {cameraActive ? (
                      <>
                        <video
                          ref={videoRef}
                          className="h-full w-full object-cover"
                          playsInline
                          muted
                        />
                        <canvas ref={canvasRef} className="hidden" />
                        <div className="qr-scanner-overlay">
                          <div className="qr-scanner-frame" />
                        </div>
                        <div className="absolute bottom-4 left-0 right-0 text-center">
                          <p className="text-sm text-white/80">Position QR code in frame</p>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-white">
                        {cameraError ? (
                          <>
                            <CameraOff className="mb-4 h-12 w-12 text-gray-400" />
                            <p className="mb-4 px-4 text-center text-sm text-gray-400">
                              {cameraError}
                            </p>
                          </>
                        ) : (
                          <>
                            <Camera className="mb-4 h-12 w-12 text-gray-400" />
                            <p className="mb-4 text-sm text-gray-400">Camera not active</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    {cameraActive ? (
                      <Button variant="outline" className="w-full" onClick={stopCamera}>
                        <CameraOff className="mr-2 h-4 w-4" />
                        Stop Camera
                      </Button>
                    ) : (
                      <Button className="w-full" onClick={startCamera}>
                        <Camera className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Manual Entry */}
              <Card>
                <CardHeader>
                  <CardTitle>Or Enter Manually</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* PIN Entry */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Enter 4-Digit PIN
                    </label>
                    <div className="flex justify-center gap-3">
                      {pin.map((digit, index) => (
                        <input
                          key={index}
                          id={`pin-${index}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handlePinChange(index, e.target.value.replace(/\D/g, ''))}
                          onKeyDown={(e) => handlePinKeyDown(index, e)}
                          className="h-14 w-14 rounded-lg border-2 border-gray-300 text-center text-2xl font-bold focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      ))}
                    </div>
                    <Button
                      className="mt-4 w-full"
                      onClick={handlePinVerify}
                      disabled={pin.some((d) => !d)}
                    >
                      Verify PIN
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="bg-white px-2 text-gray-500">OR</span>
                    </div>
                  </div>

                  {/* Reference Entry */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Enter Reference
                    </label>
                    <div className="flex gap-2">
                      <div className="flex items-center rounded-lg border border-gray-300 bg-gray-50 px-3">
                        <span className="font-mono text-gray-500">BKR-</span>
                      </div>
                      <Input
                        placeholder="ABC123"
                        value={reference}
                        onChange={(e) => setReference(e.target.value.toUpperCase())}
                        className="font-mono uppercase"
                        onKeyDown={(e) => e.key === 'Enter' && handleReferenceVerify()}
                      />
                    </div>
                    <Button
                      className="mt-4 w-full"
                      variant="outline"
                      onClick={() => handleReferenceVerify()}
                      disabled={!reference}
                    >
                      Verify Reference
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
