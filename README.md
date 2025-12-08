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

### 🚧 In Progress (Immediate Focus)
- [ ] **Stripe Webhook Config:**
    - *Task:* Ensure the **Production Webhook Secret** is set in Firebase Config to resolve the `400 Bad Request` error.
- [ ] **Stripe Live Payment API**
    - *Task:* Reroll API keys and move out of sandbox testing.
---

## 🟡 Phase 2: Production Hardening
*Before you share the link with real users, these security and config items are mandatory.*

### 1. Firestore Security Rules (Critical) 🛡️
Currently, your database likely allows read/write to anyone logged in. We need to write rules to ensure:
* Users can only read/edit their **own** maps.
* The "Sponsorship Check" query works without exposing the entire User database to the public.
* Only the Stripe Webhook (via Admin SDK) can update a user's `tier` field (preventing users from hacking their own local storage to become 'Club').

### 2. Environment Variables 🔑
* **Frontend:** Ensure `.env.production` is set up with your Live Stripe Public Key and Firebase Config.
* **Backend:** Use `firebase functions:config:set` for the Stripe Secret Key so it isn't committed in code.

### 3. Landing Page Updates 🏠
* Update `Home.vue` pricing cards to match the new model (**$6** Solo / **$10** Pro / **$29** Club).
* Add a "Contact Support" or "Report Bug" link footer.

---

## 🔵 Phase 3: Feature Polish (Post-Launch)
*Quality of life improvements to add once the system is stable.*

- [ ] **Advanced Collision Logic:** Implement the math for 45-degree bale collision checks (currently skipped).
- [ ] **Print Branding:** Allow "Pro" and "Club" users to upload a custom logo that appears on the PDF printout.
- [ ] **Agility Editor:** Unlock the Agility button and implement the specific props/rules for that sport.
- [ ] **Customer Portal:** Enable the Stripe Customer Portal link so users can cancel/upgrade subscriptions without emailing you.

---

## 🚀 Next Step Recommendation
Since we just finished the **Club Sponsorship code**, the logical next step is to **configure the Firestore Security Rules**.

Without these rules, a savvy user could technically modify their own browser data to grant themselves "Club" status or read other people's maps.

**Shall we proceed with writing the `firestore.rules`?**