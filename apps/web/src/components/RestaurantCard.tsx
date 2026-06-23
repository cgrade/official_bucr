import Link from 'next/link';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import { getImageUrl } from '@/lib/utils';

export interface VendorLite {
  id: string;
  slug: string;
  businessName: string;
  cuisineTypes?: string[];
  averageRating?: number | null;
  totalReviews?: number;
  priceLevel?: number | null;
  logo?: string | null;
  coverImage?: string | null;
  bookWithConfidence?: boolean;
  subscriptionTier?: string;
  mainBranch?: { city?: string; address?: string } | null;
}

export function RestaurantCard({ vendor }: { vendor: VendorLite }) {
  const img = getImageUrl(vendor.coverImage || vendor.logo);
  const price = vendor.priceLevel ? '₦'.repeat(vendor.priceLevel) : null;
  const premium = vendor.subscriptionTier === 'pro' || vendor.subscriptionTier === 'elite';

  return (
    <Link href={`/venue/${vendor.slug}`} className="group block card overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative aspect-[4/3] bg-[#eef1f5] overflow-hidden">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={vendor.businessName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl font-display font-bold text-[#c9a84c]">
            {vendor.businessName.charAt(0)}
          </div>
        )}
        {vendor.bookWithConfidence && (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-[#0f2547] shadow-sm">
            <ShieldCheck className="h-3.5 w-3.5 text-[#c9a84c]" /> Book with Confidence
          </span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-[19px] font-semibold text-[#0f2547] leading-tight flex items-center gap-1.5">
            {vendor.businessName}
            {premium && <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#1d9bf0] text-white text-[9px] font-black">✓</span>}
          </h3>
          {vendor.averageRating ? (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-[#0f2547] flex-shrink-0">
              <Star className="h-3.5 w-3.5 text-[#c9a84c]" fill="#c9a84c" />
              {vendor.averageRating.toFixed(1)}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[13px] text-[#7a8fa6]">
          {(vendor.cuisineTypes?.slice(0, 2).join(' · ')) || 'Restaurant'}
          {price ? <span className="text-[#c9a84c]"> · {price}</span> : null}
        </p>
        {vendor.mainBranch?.city && (
          <p className="mt-1.5 flex items-center gap-1 text-[12px] text-[#7a8fa6]">
            <MapPin className="h-3.5 w-3.5" /> {vendor.mainBranch.city}
          </p>
        )}
      </div>
    </Link>
  );
}
