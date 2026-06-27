-- One-time grandfather: every diner that exists when the "verify before booking" gate is
-- introduced is treated as verified, so the gate only applies to NEW signups. Without this,
-- enabling REQUIRE_VERIFICATION_TO_BOOK would lock every existing diner out of booking.
UPDATE "users"
SET "email_verified_at" = COALESCE("email_verified_at", "created_at")
WHERE "email_verified_at" IS NULL
  AND "phone_verified_at" IS NULL
  AND "deleted_at" IS NULL;
