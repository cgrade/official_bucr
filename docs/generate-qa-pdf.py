#!/usr/bin/env python3
from fpdf import FPDF
import os

class QAPdf(FPDF):
    def header(self):
        self.set_font("Helvetica","B",10)
        self.set_text_color(100,100,100)
        self.cell(0,6,"BUCR Platform - QA Audit Report",align="R",new_x="LMARGIN",new_y="NEXT")
        self.line(10,self.get_y(),200,self.get_y())
        self.ln(4)
    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica","I",8)
        self.set_text_color(128,128,128)
        self.cell(0,10,f"Page {self.page_no()}/{{nb}}",align="C")
    def sec(self,t):
        self.set_font("Helvetica","B",14)
        self.set_text_color(26,26,46)
        self.set_fill_color(239,192,123)
        self.cell(0,10,f"  {t}",fill=True,new_x="LMARGIN",new_y="NEXT")
        self.ln(4)
    def badge(self,s):
        c={"CRITICAL":(220,38,38),"HIGH":(234,88,12),"MEDIUM":(234,179,8),"LOW":(34,197,94),"INFO":(99,102,241)}
        r,g,b=c.get(s,(128,128,128))
        self.set_font("Helvetica","B",7)
        self.set_fill_color(r,g,b)
        self.set_text_color(255,255,255)
        w=self.get_string_width(f" {s} ")+4
        self.cell(w,5,f" {s} ",fill=True)
        self.set_text_color(0,0,0)
    def f(self,id,sev,title,detail,fix):
        self.badge(sev)
        self.set_font("Helvetica","B",9)
        self.cell(0,5,f"  {id}: {title}",new_x="LMARGIN",new_y="NEXT")
        self.set_font("Helvetica","",8)
        self.set_text_color(60,60,60)
        x0=self.l_margin
        self.set_x(x0)
        self.multi_cell(0,4,f"  Detail: {detail}")
        self.set_text_color(16,185,129)
        self.set_font("Helvetica","I",8)
        self.set_x(x0)
        self.multi_cell(0,4,f"  Fix: {fix}")
        self.set_text_color(0,0,0)
        self.ln(2)
    def trow(self,cols,w,bold=False,fill=False):
        self.set_font("Helvetica","B" if bold else "",8)
        if fill:
            self.set_fill_color(22,33,62);self.set_text_color(255,255,255)
        for c,wi in zip(cols,w):
            self.cell(wi,6,str(c),border=1,fill=fill)
        self.ln()
        self.set_text_color(0,0,0)

pdf=QAPdf()
pdf.alias_nb_pages()
pdf.set_auto_page_break(auto=True,margin=20)
pdf.add_page()

# Cover
pdf.ln(30)
pdf.set_font("Helvetica","B",28);pdf.set_text_color(26,26,46)
pdf.cell(0,15,"BUCR Platform",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.set_font("Helvetica","B",22);pdf.set_text_color(239,192,123)
pdf.cell(0,12,"End-to-End QA Audit Report",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.ln(8)
pdf.set_font("Helvetica","",12);pdf.set_text_color(100,100,100)
pdf.cell(0,8,"April 2026",align="C",new_x="LMARGIN",new_y="NEXT")
pdf.ln(15)

# Summary
pdf.set_text_color(0,0,0)
pdf.sec("Executive Summary")
w=[40,25,25,25,25,25,25]
pdf.trow(["Category","Critical","High","Medium","Low","Info","Total"],w,bold=True,fill=True)
for r in [
    ["Database Schema","2","3","4","2","0","11"],
    ["Backend Services","1","4","3","2","0","10"],
    ["API Routes","2","3","5","3","2","15"],
    ["Vendor Portal","0","2","4","3","0","9"],
    ["Admin Portal","0","1","3","2","0","6"],
    ["Mobile App","1","3","5","2","0","11"],
    ["TOTAL","6","16","24","14","2","62"],
]:
    pdf.trow(r,w,bold=(r[0]=="TOTAL"))
pdf.ln(6)

# DB Schema
pdf.sec("1. Database Schema")
pdf.f("1.1","CRITICAL","User model has no role field","UserRole enum exists but is NOT on User model. Auth role from JWT only, no DB enforcement.","Add `role UserRole @default(user)` to User model + migration.")
pdf.f("1.2","CRITICAL","VendorBranch missing vendorId index","Queried heavily by vendorId but no index. Full table scans on dashboard.","Add `@@index([vendorId])`.")
pdf.f("1.3","HIGH","MenuCategory & Menu missing vendorId indexes","Queried by vendorId on every menu page load, no indexes.","Add `@@index([vendorId])` to both.")
pdf.f("1.4","HIGH","GalleryImage missing vendorId index","Queried by vendorId on gallery page.","Add `@@index([vendorId])`.")
pdf.f("1.5","HIGH","Experience missing vendorId + isActive indexes","Queried by vendorId+isActive for public listing.","Add `@@index([vendorId])` and `@@index([isActive])`.")
pdf.f("1.6","MEDIUM","Multiple models missing vendorId indexes","VendorDocument, GuestProfile, Achievement, SpecialOffer lack indexes.","Add `@@index([vendorId])` to each.")
pdf.f("1.7","MEDIUM","Invitation missing reservationId index","Queried by reservationId for reservation details.","Add `@@index([reservationId])`.")
pdf.f("1.8","MEDIUM","Waitlist missing vendorId + status indexes","Queried by vendorId and status.","Add `@@index([vendorId])` and `@@index([status])`.")
pdf.f("1.9","MEDIUM","VendorSubscription missing composite index","checkExpiredSubscriptions queries by expiresAt+tier, no composite.","Add `@@index([subscriptionExpiresAt, subscriptionTier])`.")
pdf.f("1.10","LOW","Review + Favorite missing userId indexes","Queried by userId for user lists.","Add `@@index([userId])` to both.")

# Services
pdf.add_page()
pdf.sec("2. Backend Services")
pdf.f("2.1","CRITICAL","token.service.ts uses in-memory Map","Tokens lost on restart; no scaling; memory leak risk.","Migrate to Redis or DB-backed store.")
pdf.f("2.2","HIGH","order_payment handler is no-op","payment.service.ts:416 - confirmOrderPayment() never called after Paystack payment.","Call confirmOrderPayment() in order_payment handler.")
pdf.f("2.3","HIGH","GuestProfile never updated","checkIn doesn't increment visitCount/lastVisit; noShow doesn't record either.","Add guest profile updates in checkIn and markNoShow.")
pdf.f("2.4","HIGH","Notifications never sent","sendReservationConfirmation etc. exist but never called from services.","Add notification calls in create/checkIn/noShow/cancel flows.")
pdf.f("2.5","HIGH","adjustment credit type has no function","CreditTransactionType includes adjustment but no service creates it.","Add adjustUserCredits() and adjustVendorCredits() to credit.service.ts.")
pdf.f("2.6","MEDIUM","Missing service files","Reviews, guest-profiles, experiences logic inline in routes.","Extract to dedicated service files.")
pdf.f("2.7","MEDIUM","No notification scheduling","Reservation reminders should be automated.","Create notification.service.ts with scheduled reminders.")
pdf.f("2.8","MEDIUM","Credit expiry not automated","processExpiredCredits requires manual trigger.","Set up cron job to call /api/cron/credits daily.")
pdf.f("2.9","LOW","Unused functions","generateQRCodeBuffer, uploadFromUrl never called.","Remove or wire up.")

# API Routes
pdf.sec("3. API Routes")
pdf.f("3.1","CRITICAL","Mobile favorites remove URL mismatch","Calls DELETE /users/favorites?vendorId=X but route is DELETE /users/favorites/[id]. 404.","Fix mobile to call DELETE /users/favorites/[id] or fix route to accept vendorId.")
pdf.f("3.2","CRITICAL","Mobile profile update method mismatch","Calls PUT /users/profile but route only has PATCH. 405 error.","Change mobile to use PATCH or add PUT handler.")
pdf.f("3.3","HIGH","No POST /orders user route","Mobile order screen has no creation API.","Add user-facing order creation route.")
pdf.f("3.4","HIGH","No GET /users/orders route","Mobile order history needs this; only /vendor/orders exists.","Add GET /users/orders route.")
pdf.f("3.5","HIGH","GET /experiences ignores filter params","Mobile sends vendorId/featured params but backend ignores them.","Add query filters to experiences route.")
pdf.f("3.6","MEDIUM","No POST /waitlist endpoint","Schema has Waitlist model but no API.","Add waitlist routes.")
pdf.f("3.7","MEDIUM","No POST /reservations/[id]/invite","Schema has Invitation model but no API.","Add invitation routes.")
pdf.f("3.8","MEDIUM","No cron scheduler","processExpiredCredits and checkExpiredSubscriptions never triggered.","Set up Vercel cron or external scheduler.")
pdf.f("3.9","LOW","Dev-only seed endpoint in prod","POST /vendor/menu/categories/seed should be guarded.","Add env check or remove.")
pdf.f("3.10","LOW","SSE realtime endpoint unused","GET /api/realtime/events has no consumer.","Implement or remove.")

# Vendor Portal
pdf.add_page()
pdf.sec("4. Vendor Portal")
pdf.f("4.1","HIGH","Login response shape mismatch","Expects {token, refreshToken} but backend returns {tokens: {accessToken, refreshToken}}.","Fix authApi.login to match backend response shape.")
pdf.f("4.2","HIGH","Dashboard hardcodes change values","+12%, +8%, +23% are not calculated from real data.","Wire to actual analytics data.")
pdf.f("4.3","MEDIUM","Notification bell hardcodes badge 3","Not connected to real notification count.","Wire to notification API.")
pdf.f("4.4","MEDIUM","useRealtimeSync connects but doesn't consume","Wastes connection; no real SSE consumption.","Implement or remove hook.")
pdf.f("4.5","MEDIUM","No branch management UI","API routes exist at /vendor/branches but no portal page.","Add branch management page.")
pdf.f("4.6","MEDIUM","Special offers page may be display-only","No POST/PUT API integration visible.","Verify and complete integration.")
pdf.f("4.7","LOW","No loading skeletons on most pages","Only dashboard has loading state.","Add skeleton loaders.")
pdf.f("4.8","LOW","Image carousel no touch/swipe","Mobile viewport users can't swipe images.","Add touch gesture support.")

# Admin Portal
pdf.sec("5. Admin Portal")
pdf.f("5.1","HIGH","No branch management page","Schema has VendorBranch, API exists, but no admin UI.","Add branch management page.")
pdf.f("5.2","MEDIUM","Notifications page placeholder","No notification backend service.","Implement notification service + UI.")
pdf.f("5.3","MEDIUM","No audit log viewer","AuditLog model and routes exist but no frontend.","Add audit log viewer page.")
pdf.f("5.4","MEDIUM","Reports may lack full export","Generate endpoint exists but CSV/PDF export may be incomplete.","Verify and complete export functionality.")
pdf.f("5.5","LOW","No content management page","Promos/banners have no admin UI.","Add content management page.")

# Mobile App
pdf.add_page()
pdf.sec("6. Mobile App")
pdf.f("6.1","CRITICAL","Missing ordersApi in api.ts","No order creation/history/cancel endpoints defined in mobile API client.","Add ordersApi with create, getAll, getById, cancel, confirmPayment.")
pdf.f("6.2","HIGH","Missing waitlistApi","Waitlist screen likely non-functional without API client.","Add waitlistApi to api.ts.")
pdf.f("6.3","HIGH","forgot-password calls sendOtp but no backend phone reset route","No route handles phone-based password reset.","Add phone-based password reset route.")
pdf.f("6.4","HIGH","Booking flow may not handle insufficient credits","venue/[slug]/book.tsx may not show credit insufficient scenario properly.","Add credit check before booking and insufficient balance UI.")
pdf.f("6.5","MEDIUM","No push notification handling","updatePushToken sent but no listener processes incoming notifications.","Add Expo push notification listener.")
pdf.f("6.6","MEDIUM","Paystack callback may not deep-link","wallet/buy.tsx Paystack callback URL may not return to app.","Configure Paystack callback with app deep-link.")
pdf.f("6.7","MEDIUM","deleteAvatar route verification","Calls DELETE /users/profile/avatar - verify backend handles it.","Test and confirm route works.")
pdf.f("6.8","MEDIUM","No event ticket check-in QR display","Event tickets should show QR for check-in but may not render properly.","Verify QR rendering in event ticket detail.")
pdf.f("6.9","LOW","Possible duplicate settings screens","settings/privacy.tsx + privacy-policy.tsx may duplicate.","Consolidate and remove duplicates.")
pdf.f("6.10","LOW","No offline/partial offline support","App requires constant network.","Add basic offline caching for viewed content.")

# Top Recommendations
pdf.add_page()
pdf.sec("Top 6 Recommendations (Priority Order)")
recs = [
    ("1","Add role to User model + migration","Blocks unauthorized vendor API access. Critical for security.","Schema + Migration + Auth middleware update"),
    ("2","Fix mobile API mismatches","Favorites remove URL, profile update method, add ordersApi. App is broken for these flows.","Mobile api.ts + backend route fixes"),
    ("3","Migrate token store to Redis","Production-critical for OTP/verification. In-memory Map loses tokens on restart.","token.service.ts + Redis setup"),
    ("4","Wire up notification services","Email/SMS functions exist but never called. Users get no confirmations.","Reservation + Order services"),
    ("5","Add missing DB indexes","10+ tables need vendorId indexes for query performance. Dashboard slow without them.","Prisma schema migration"),
    ("6","Implement cron jobs","Credit expiry + subscription expiry need scheduled execution.","Vercel cron config or external scheduler"),
]
for num,title,why,scope in recs:
    pdf.set_font("Helvetica","B",11)
    pdf.set_text_color(26,26,46)
    pdf.cell(0,7,f"  {num}. {title}",new_x="LMARGIN",new_y="NEXT")
    pdf.set_font("Helvetica","",9)
    pdf.set_text_color(60,60,60)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0,5,f"    Why: {why}")
    pdf.set_text_color(16,185,129)
    pdf.set_x(pdf.l_margin)
    pdf.multi_cell(0,5,f"    Scope: {scope}")
    pdf.set_text_color(0,0,0)
    pdf.ln(3)

out = os.path.join(os.path.dirname(__file__), "QA-AUDIT.pdf")
pdf.output(out)
print(f"PDF generated: {out}")
