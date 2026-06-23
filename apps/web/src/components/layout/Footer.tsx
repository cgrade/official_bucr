import Link from 'next/link';
import { BucrWordmark } from '@/components/ui/BucrWordmark';

export function Footer() {
  return (
    <footer className="bg-[#0f2547] text-[#f5f0e8] mt-20">
      <div className="max-w-6xl mx-auto px-5 py-12 grid gap-8 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
          <BucrWordmark height={30} light />
          <p className="mt-3 text-[13px] text-[#7a8fa6] max-w-xs italic font-display">Your table, actually waiting.</p>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#c9a84c] mb-3">Discover</h4>
          <ul className="space-y-2 text-[13px] text-[rgba(245,240,232,0.8)]">
            <li><Link href="/restaurants" className="hover:text-[#c9a84c]">Restaurants</Link></li>
            <li><Link href="/events" className="hover:text-[#c9a84c]">Events</Link></li>
            <li><Link href="/#how-it-works" className="hover:text-[#c9a84c]">How it works</Link></li>
            <li><Link href="/register" className="hover:text-[#c9a84c]">Create an account</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#c9a84c] mb-3">For restaurants</h4>
          <ul className="space-y-2 text-[13px] text-[rgba(245,240,232,0.8)]">
            <li><a href="http://localhost:3001/register" className="hover:text-[#c9a84c]">List your restaurant</a></li>
            <li><a href="http://localhost:3001" className="hover:text-[#c9a84c]">Vendor portal</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[12px] font-bold uppercase tracking-wider text-[#c9a84c] mb-3">Company</h4>
          <ul className="space-y-2 text-[13px] text-[rgba(245,240,232,0.8)]">
            <li><a href="mailto:support@bucr.ng" className="hover:text-[#c9a84c]">Contact</a></li>
            <li><Link href="/terms" className="hover:text-[#c9a84c]">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-[#c9a84c]">Privacy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[rgba(201,168,76,0.15)]">
        <div className="max-w-6xl mx-auto px-5 py-4 text-[12px] text-[#7a8fa6]">
          © {new Date().getFullYear()} Bucr Limited · Nigeria
        </div>
      </div>
    </footer>
  );
}
