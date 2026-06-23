'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import { MapPin, Star } from 'lucide-react';
import type { VendorLite } from '@/components/RestaurantCard';

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

interface MapVendor extends VendorLite {
  mainBranch?: { city?: string; address?: string; latitude?: number; longitude?: number } | null;
}

export function VendorsMap({ vendors }: { vendors: MapVendor[] }) {
  const pins = useMemo(
    () => vendors.filter((v) => v.mainBranch?.latitude != null && v.mainBranch?.longitude != null),
    [vendors],
  );
  const [active, setActive] = useState<string | null>(null);

  if (!TOKEN) {
    return (
      <div className="card h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <MapPin className="h-8 w-8 text-[#c9a84c]" />
        <p className="mt-3 font-medium text-ink">Map unavailable</p>
        <p className="text-[13px] text-muted mt-1">Set <code className="text-[#c9a84c]">NEXT_PUBLIC_MAPBOX_TOKEN</code> to enable the map view.</p>
      </div>
    );
  }

  const center = pins[0]?.mainBranch
    ? { longitude: pins[0].mainBranch!.longitude!, latitude: pins[0].mainBranch!.latitude! }
    : { longitude: 7.4951, latitude: 9.0579 }; // Abuja

  return (
    <div className="card overflow-hidden h-[60vh]">
      <Map
        mapboxAccessToken={TOKEN}
        initialViewState={{ ...center, zoom: 11 }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/streets-v12"
      >
        <NavigationControl position="top-right" />
        {pins.map((v) => (
          <Marker
            key={v.id}
            longitude={v.mainBranch!.longitude!}
            latitude={v.mainBranch!.latitude!}
            anchor="bottom"
            onClick={(e) => { e.originalEvent.stopPropagation(); setActive(v.id); }}
          >
            <div className="cursor-pointer flex flex-col items-center">
              <div className="rounded-full bg-[#c9a84c] text-[#070f1e] text-[10px] font-bold px-2 py-1 shadow-md whitespace-nowrap">
                {v.priceLevel ? '₦'.repeat(v.priceLevel) : '📍'}
              </div>
            </div>
          </Marker>
        ))}
        {active && (() => {
          const v = pins.find((p) => p.id === active);
          if (!v) return null;
          return (
            <Popup longitude={v.mainBranch!.longitude!} latitude={v.mainBranch!.latitude!} anchor="top" onClose={() => setActive(null)} closeButton={false} offset={12}>
              <Link href={`/venue/${v.slug}`} className="block min-w-[160px]">
                <p className="font-semibold text-[#0f2547] text-[14px]">{v.businessName}</p>
                <p className="text-[12px] text-[#7a8fa6]">{v.cuisineTypes?.slice(0, 2).join(' · ')}</p>
                {v.averageRating ? (
                  <p className="flex items-center gap-1 text-[12px] text-[#0f2547] mt-0.5"><Star className="h-3 w-3 text-[#c9a84c]" fill="#c9a84c" /> {v.averageRating.toFixed(1)}</p>
                ) : null}
                <span className="text-[12px] font-semibold text-[#c9a84c]">View →</span>
              </Link>
            </Popup>
          );
        })()}
      </Map>
    </div>
  );
}
