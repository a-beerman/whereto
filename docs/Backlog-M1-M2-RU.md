# Backlog (RU)  Month 12

## Month 1
### Epic A: Catalog (read) via tg-platform-api
- A1: List restaurants (GET /restaurants) w filters
- A2: Restaurant details (GET /restaurants/:id)
- A3: Menu (GET /restaurants/:id/menu)

### Epic B: Miniapp B2C
- B1: /c/discover list + search + filters
- B2: /c/restaurants/:id details
- B3: Menu read-only

### Epic C: Plan + Join + Vote
- C1: /plan creates plan
- C2: Join required (POST /plans/:id/join)
- C3: Prefs
- C4: shortlist generate
- C5: vote create with 1/2/3/6h duration
- C6: cast one-shot
- C7: close manual/auto_all_voted/timeout + tie-break
- C8: timeout_no_votes  recommendation + revote (initiator)

### Epic D: Roles + merchant onboarding
- D1: GET /me
- D2: POST /merchant/link (invite code reusable)

## Month 2
### Epic E: Booking requests
- E1: create booking request
- E2: merchant inbox
- E3: confirm/reject/propose time
- E4: notifications

### Epic F: Miniapp B2B
- F1: /m/inbox guarded
- F2: merchant selector (multi-merchant)
- F3: request details + actions

### Epic G: Admin (minimum)
- G1: mark restaurant partner
- G2: invite code view/rotate
