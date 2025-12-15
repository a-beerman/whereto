# Business Strategy and Go-to-Market Plan

> **Reference**: This document outlines the business model, pricing, and go-to-market strategy for MVP. For technical implementation, see [`docs/FINAL-SPEC.md`](FINAL-SPEC.md).

## Two-Track MVP Strategy

### Track 1: Mass Coverage (150+ restaurants in Kishinev)
**Goal**: User growth and habit formation

- All venues available for discovery
- CTA: "Call" / "Route" / "Open Menu"
- No booking confirmation in system
- Focus: Group decision-making and discovery

### Track 2: Partner Pilot (20 restaurants)
**Goal**: Measurable monetization and proof of concept

- Selected restaurants with booking confirmation
- CTA: "Request Booking in TG"
- Merchant bot/cabinet for confirmations
- SLA tracking (target: <5 min response time)
- Prioritized in search results

## Business Model

### Revenue Stream 1: Pay-per-Confirmed-Booking
- **Pricing**: $0.8 - $1.5 per confirmed booking
- **Gradation by group size**:
  - 2-3 people: $0.6
  - 4-6 people: $1.0
  - 7+ people: $1.5-2.0
- **Target**: 20 partner restaurants, 10-20 requests/month each
- **Expected Revenue (pessimistic)**: $120-180/month

### Revenue Stream 2: Subscription (Hybrid Model)
- **Starter**: $29-49/month
  - TG booking requests
  - Basic analytics
  - Confirmation system
- **Pro**: $79-129/month (Phase 2)
  - Priority in search results
  - Marketplace offers on plans
  - Advanced analytics
- **Hybrid**: $29/month + $0.5 per confirmed booking
- **Target**: Convert 5-10 of 20 partners to subscription
- **Expected Revenue (pessimistic)**: $145/month

### Revenue Stream 3: Affiliate (foodhouse.md)
- **Take Rate**: 2-5% (pessimistic: 2%)
- **Model**: Referral traffic to delivery partner
- **Expected Revenue (MVP)**: Minimal in early stages

## Go-to-Market: Kishinev

### Supply Side (Restaurants)
- **Existing Base**: 150 restaurants with menus/photos in system
- **Segmentation**:
  - Top 50: Most popular venues
  - Mid 70: Good coverage
  - Long tail: Remaining venues
- **Partner Selection**: 20 from Top 50
- **Onboarding Offer**:
  - 2 months free trial
  - OR: Pay only for confirmed bookings
  - Promise: Group bookings (4-10 people) - highest value
  - SLA requirement: <5 min response time

### Demand Side (Users)
- **Target**: Telegram groups (friends, colleagues, families)
- **Growth Channels**:
  - Telegram city channels + micro-influencers
  - Promo in partner restaurants (stickers: "Group choice in TG")
  - Viral mechanics: "Invite friends to plan"
- **Target Metrics**:
  - 100 plans/week by end of week 8
  - Average 4 participants per plan
  - 60% vote completion rate
  - 20-30% repeat usage (second plan within 30 days)

## Financial Projections (Pessimistic MVP)

### Costs (10 weeks ≈ 2.5 months)
- **Development**: 3 devs × $2k/month × 2.5 = $15k
- **Management**: 2 × $1k/month × 2.5 = $5k
- **Infrastructure**: $200-500/month × 2.5 = $500-1,250
- **Marketing**: $300-1,000 (minimal)
- **Total**: ~$21-23k

### Revenue (End of Month 2)
- **Bookings**: $120-180/month
- **Subscriptions**: $145/month (5 restaurants)
- **Affiliate**: ~$0 (early stage)
- **Total**: ~$265-325/month

### Unit Economics
- **Cost per confirmed booking**: ~$0.50-0.75 (infrastructure + support)
- **Revenue per confirmed booking**: $1.0
- **Gross margin**: ~25-50% (improves with scale)

## Success Metrics

### User Engagement
- Plans/week: 100 by week 8
- Vote completion: ≥60%
- Average participants: 3-5
- Repeat rate: 20-30% of initiators

### Partner Performance
- Booking requests: 200-300/month (10-15 per restaurant)
- Confirm rate: ≥60%
- Median response time: ≤5 minutes
- Partner retention: 5-10 paying subscribers

### Business Health
- Revenue growth trajectory
- Unit economics improvement
- Partner expansion readiness (20 → 50)

## Risk Mitigation

### Risk: Restaurants don't respond quickly
- **Mitigation**: SLA tracking, priority in results, operator buffer for first 2-4 weeks

### Risk: Low booking confirmation rate
- **Mitigation**: Focus on 20 partners with SLA, prioritize in shortlist, better UX for "Request Booking"

### Risk: Low user engagement
- **Mitigation**: Viral mechanics, Telegram-native features, focus on group decision pain point

## Roadmap Beyond MVP

1. **Scale Partners**: 20 → 50 restaurants
2. **Increase Requests**: 10-15 → 20-30 per restaurant/month
3. **Marketplace Offers**: Restaurants can offer discounts on plans
4. **ProvectaPOS Integration**: Automate booking confirmations
5. **Multi-city Expansion**: Replicate Kishinev model

