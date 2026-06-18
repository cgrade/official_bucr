# Static Assets Guide - Bucr Vendor Portal

This guide explains how to add your logo, background images, and other static assets to the Vendor Portal.

---

## 📁 Directory Structure

```
apps/vendor-portal/
├── public/
│   ├── images/
│   │   ├── login-bg.jpg        # Login page background image
│   │   ├── logo.png            # Main logo (colored)
│   │   ├── logo-white.png      # White logo for dark backgrounds
│   │   ├── logo-dark.png       # Dark logo for light backgrounds
│   │   ├── favicon.ico         # Browser favicon
│   │   └── og-image.png        # Open Graph image for social sharing
│   └── icons/
│       ├── icon-192.png        # PWA icon 192x192
│       └── icon-512.png        # PWA icon 512x512
```

---

## 🖼️ Required Images

### 1. Login Background Image
**File:** `public/images/login-bg.jpg`
**Recommended Size:** 1920x1080px (minimum)
**Format:** JPG or WebP (for better compression)
**Tips:**
- Use a high-quality restaurant/dining image
- The image will have a dark gradient overlay, so bright or dark images both work
- Landscape orientation works best

### 2. Logo Variations
| File | Size | Background | Usage |
|------|------|------------|-------|
| `logo.png` | 200x200px | Transparent | General use |
| `logo-white.png` | 200x200px | Transparent | Dark backgrounds (sidebar, login branding) |
| `logo-dark.png` | 200x200px | Transparent | Light backgrounds |

### 3. Favicon & PWA Icons
| File | Size | Format |
|------|------|--------|
| `favicon.ico` | 32x32px | ICO |
| `icon-192.png` | 192x192px | PNG |
| `icon-512.png` | 512x512px | PNG |

---

## 🎨 Brand Colors Reference

Use these colors when creating or editing images:

```css
/* Primary - Ocean Blue */
--primary-500: #3B82F6;
--primary-600: #2563EB;

/* Secondary - Oak Brown */
--secondary-400: #C4956A;
--secondary-500: #A67C52;
--secondary-600: #8B6544;

/* Accent - Cyan */
--cyan-400: #22D3EE;
--cyan-500: #06B6D4;

/* Gradients */
Primary Gradient: linear-gradient(135deg, #3B82F6, #06B6D4)
Secondary Gradient: linear-gradient(135deg, #A67C52, #C4956A)
```

---

## 🔧 How to Add Images

### Step 1: Add your images
Place your images in the appropriate folders:
```bash
# Copy your files
cp /path/to/your/login-background.jpg apps/vendor-portal/public/images/login-bg.jpg
cp /path/to/your/logo-white.png apps/vendor-portal/public/images/logo-white.png
```

### Step 2: Update the Login Page Logo
In `src/app/(auth)/login/page.tsx`, uncomment and update the logo:

```tsx
// Change from:
{/* <Image src="/images/logo-white.png" alt="Bucr" width={48} height={48} className="rounded-xl" /> */}

// To:
<Image src="/images/logo-white.png" alt="Bucr" width={48} height={48} className="rounded-xl" />
```

Don't forget to add the import at the top:
```tsx
import Image from 'next/image';
```

### Step 3: Update the Sidebar Logo
In `src/components/layout/sidebar.tsx`, replace the letter logo:

```tsx
// Change from:
<div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500">
  <span className="text-xl font-bold text-white">B</span>
</div>

// To:
<Image 
  src="/images/logo-white.png" 
  alt="Bucr" 
  width={44} 
  height={44} 
  className="rounded-xl"
/>
```

### Step 4: Update Favicon
Replace the default Next.js favicon in `src/app/`:

```tsx
// In src/app/layout.tsx, add to metadata:
export const metadata: Metadata = {
  title: 'Bucr Vendor Portal',
  description: 'Manage your restaurant bookings and orders',
  icons: {
    icon: '/favicon.ico',
    apple: '/icons/icon-192.png',
  },
};
```

---

## 📱 Mobile App Icons (Future)

For the React Native mobile app, you'll need:

```
apps/mobile/
├── assets/
│   ├── icon.png              # 1024x1024px (App Store icon)
│   ├── adaptive-icon.png     # 1024x1024px (Android adaptive)
│   ├── splash.png            # 1284x2778px (Splash screen)
│   └── favicon.png           # 48x48px (Web favicon)
```

---

## 🌐 Cloudinary Integration (Production)

For production, images should be served from Cloudinary for optimization:

### Upload to Cloudinary
```bash
# Using Cloudinary CLI or dashboard
cloudinary upload public/images/login-bg.jpg folder=bucr/vendor-portal
```

### Use Cloudinary URLs
```tsx
// next.config.js already configured for Cloudinary
<Image 
  src="https://res.cloudinary.com/your-cloud/image/upload/v1/bucr/vendor-portal/login-bg.jpg"
  alt="Background"
  fill
  className="object-cover"
/>
```

---

## ✅ Checklist

- [ ] Add `login-bg.jpg` (1920x1080+)
- [ ] Add `logo.png` (200x200, transparent)
- [ ] Add `logo-white.png` (200x200, transparent)
- [ ] Add `logo-dark.png` (200x200, transparent)
- [ ] Add `favicon.ico` (32x32)
- [ ] Add `icon-192.png` (192x192)
- [ ] Add `icon-512.png` (512x512)
- [ ] Add `og-image.png` (1200x630) for social sharing
- [ ] Update login page to use logo image
- [ ] Update sidebar to use logo image
- [ ] Update metadata with favicon

---

## 💡 Pro Tips

1. **Image Optimization**: Use WebP format for better compression
2. **Lazy Loading**: Next.js Image component handles this automatically
3. **Responsive Images**: Use the `fill` prop with `object-cover` for backgrounds
4. **Dark Mode**: Test all images in both light and dark mode
5. **Accessibility**: Always include meaningful `alt` text

---

## 🎯 Quick Reference - File Locations

| Asset | Location | Used In |
|-------|----------|---------|
| Login BG | `/public/images/login-bg.jpg` | Login page left panel |
| White Logo | `/public/images/logo-white.png` | Sidebar, Login branding |
| Dark Logo | `/public/images/logo-dark.png` | Light mode headers |
| Favicon | `/public/favicon.ico` | Browser tab |
| OG Image | `/public/images/og-image.png` | Social media shares |

---

Need help? Check the [Next.js Image Documentation](https://nextjs.org/docs/app/api-reference/components/image)
