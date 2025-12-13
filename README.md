# 🗺️ Project Roadmap: K9 Course Builder

## 🟢 Phase 1: Core MVP (Current Status)
*We are finalizing the logic for the tiered access model and sponsorship system.*

### ✅ Completed
- [x] **Core Editor:** Barn Hunt map creation, saving, and placement tools.
- [x] **Autosave:** LocalStorage backup to prevent data loss on refresh.
- [x] **Dashboard:** Folder organization, moving maps, and tiered UI.
- [x] **Payments (Stripe):** Checkout sessions for Solo/Club tiers.
- [x] **Backend:** Cloud Functions (v2) for Stripe Session creation & Webhooks.
- [x] **Structure:** Pinia Stores (`userStore`, `mapStore`) refactored for permissions.
- [x] **Club Sponsorship Verification:** User A (Club) adds User B (Free) email to roster -> User B logs in -> User B sees "Pro" badge.
- [x] **Folder Deletion Fix:** Verify the new "Batch Delete" logic moves orphaned maps to "Unfiled" correctly.
