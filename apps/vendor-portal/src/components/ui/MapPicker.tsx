'use client';

/**
 * MapPicker — Mapbox GL JS map for picking a branch location.
 *
 * Usage:
 *   <MapPicker
 *     address="Lagos Island, Nigeria"
 *     lat={6.455}
 *     lng={3.384}
 *     onChange={({ lat, lng, formattedAddress }) => { ... }}
 *   />
 *
 * The component:
 *  1. Shows a draggable pin at the provided lat/lng (defaults to Lagos).
 *  2. Calls the BUCR backend geocoding endpoint (not Mapbox directly) when the
 *     user types an address — so the secret token stays server-side.
 *  3. Reports { lat, lng, formattedAddress } to the parent via onChange.
 *
 * Token: NEXT_PUBLIC_MAPBOX_TOKEN (public/scoped, map display only).
 * Geocoding calls: NEVER to Mapbox from the browser — always via /api/geocode.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2, Navigation } from 'lucide-react';

// Lagos Island default
const DEFAULT_LNG = 3.3792;
const DEFAULT_LAT = 6.5244;
const DEFAULT_ZOOM = 14;

export interface MapPickerValue {
  lat: number;
  lng: number;
  formattedAddress?: string;
}

interface Props {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  onChange?: (value: MapPickerValue) => void;
  className?: string;
}

export default function MapPicker({ lat, lng, address, onChange, className = '' }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef          = useRef<any>(null);
  const markerRef       = useRef<any>(null);

  const [addressInput, setAddressInput] = useState(address ?? '');
  const [geocoding, setGeocoding]       = useState(false);
  const [mapLoaded, setMapLoaded]       = useState(false);
  const [initLat]  = useState(lat  ?? DEFAULT_LAT);
  const [initLng]  = useState(lng  ?? DEFAULT_LNG);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? '';

  // ── Initialize the map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || !token) return;

    let mapboxgl: any;
    import('mapbox-gl').then((mod) => {
      mapboxgl = mod.default;
      mapboxgl.accessToken = token;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [initLng, initLat],
        zoom: DEFAULT_ZOOM,
      });

      // Draggable marker
      const marker = new mapboxgl.Marker({ color: '#c9a84c', draggable: true })
        .setLngLat([initLng, initLat])
        .addTo(map);

      marker.on('dragend', () => {
        const { lng: newLng, lat: newLat } = marker.getLngLat();
        onChange?.({ lat: newLat, lng: newLng });
        // Reverse geocode via backend (fire-and-forget display update)
        fetch(`/api/geocode/reverse?lat=${newLat}&lng=${newLng}`)
          .then((r) => r.json())
          .then((d) => {
            if (d.data?.formattedAddress) {
              setAddressInput(d.data.formattedAddress);
              onChange?.({ lat: newLat, lng: newLng, formattedAddress: d.data.formattedAddress });
            }
          })
          .catch(() => {});
      });

      map.on('load', () => setMapLoaded(true));

      mapRef.current    = map;
      markerRef.current = marker;
    });

    return () => {
      mapRef.current?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Update marker when parent passes new coordinates ──────────────────
  useEffect(() => {
    if (!markerRef.current || lat == null || lng == null) return;
    markerRef.current.setLngLat([lng, lat]);
    mapRef.current?.flyTo({ center: [lng, lat], zoom: DEFAULT_ZOOM, duration: 800 });
  }, [lat, lng]);

  // ── Forward geocode via backend ────────────────────────────────────────
  const geocodeAddress = useCallback(async () => {
    if (!addressInput.trim()) return;
    setGeocoding(true);
    try {
      const res  = await fetch(`/api/geocode?address=${encodeURIComponent(addressInput)}`);
      const data = await res.json();
      if (data.data?.lat && data.data?.lng) {
        const { lat: newLat, lng: newLng, formattedAddress } = data.data;
        markerRef.current?.setLngLat([newLng, newLat]);
        mapRef.current?.flyTo({ center: [newLng, newLat], zoom: DEFAULT_ZOOM, duration: 800 });
        setAddressInput(formattedAddress ?? addressInput);
        onChange?.({ lat: newLat, lng: newLng, formattedAddress });
      }
    } catch {
      /* ignore */
    } finally {
      setGeocoding(false);
    }
  }, [addressInput, onChange]);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Address search row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#7a8fa6]" />
          <input
            type="text"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && geocodeAddress()}
            placeholder="Enter address to geocode…"
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-[rgba(201,168,76,0.18)] rounded-xl bg-[rgba(255,255,255,0.04)] text-[#f5f0e8] placeholder:text-[#7a8fa6] focus:outline-none focus:ring-2 focus:ring-[#c9a84c]/30"
          />
        </div>
        <button
          type="button"
          onClick={geocodeAddress}
          disabled={geocoding || !addressInput.trim()}
          className="px-4 py-2.5 rounded-xl bg-[#c9a84c] hover:bg-[#a07830] disabled:opacity-50 text-white text-sm font-medium flex items-center gap-2 transition-colors"
        >
          {geocoding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          Find
        </button>
      </div>

      {/* Map container */}
      <div
        ref={mapContainerRef}
        className="relative w-full h-64 rounded-xl overflow-hidden border border-[rgba(201,168,76,0.18)] bg-slate-100 bg-[rgba(255,255,255,0.04)]"
      >
        {!mapLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          </div>
        )}
        {!token && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-100 bg-[rgba(255,255,255,0.04)]">
            <p className="text-sm text-[#7a8fa6]">Set NEXT_PUBLIC_MAPBOX_TOKEN to enable map</p>
          </div>
        )}
      </div>

      <p className="text-xs text-[#7a8fa6]">
        Drag the pin to adjust position precisely, or type an address and click Find.
      </p>
    </div>
  );
}
