# Algorithm Specifications

This document provides detailed algorithm specifications for core features of WhereTo MVP.

> **Reference**: These algorithms implement the specifications in [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 13. For the canonical implementation-ready specification, see FINAL-SPEC.md.

## 1. Shortlist Generation Algorithm

Generate shortlist of 5 venues for a group plan based on participant preferences.

### Inputs

- **Plan**: `date`, `time`, `area`/`location`, `budget`, `format`
- **Participants**: Array of participant objects with:
  - `user_id`: Telegram user ID
  - `preferences`: Object with format, budget, cuisine, alcohol, quiet, etc.
  - `location`: Optional lat/lng for midpoint calculation
- **Venue catalog**: Filtered by city, status = 'active'

### Algorithm Steps

#### Step 1: Calculate Meeting Point

```typescript
function calculateMeetingPoint(plan: Plan, participants: Participant[]): Point {
  if (plan.location) {
    // Specific location provided
    return { lat: plan.location_lat, lng: plan.location_lng };
  }
  
  if (plan.area === 'midpoint' && participants.length > 1) {
    // Calculate centroid of participant locations
    const locations = participants
      .filter(p => p.location_lat && p.location_lng)
      .map(p => ({ lat: p.location_lat!, lng: p.location_lng! }));
    
    if (locations.length > 0) {
      const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
      const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
      return { lat: avgLat, lng: avgLng };
    }
  }
  
  // Fallback: use city center or area center
  return getCityOrAreaCenter(plan.city_id, plan.area);
}
```

#### Step 2: Filter Venues

```typescript
function filterVenues(
  cityId: string,
  meetingPoint: Point,
  plan: Plan,
  allVenues: Venue[],
): Venue[] {
  return allVenues.filter(venue => {
    // Basic filters
    if (venue.city_id !== cityId) return false;
    if (venue.status !== 'active') return false;
    
    // Category/format match
    if (plan.format && !venue.categories.includes(plan.format)) return false;
    
    // Budget match (if venue has budget info)
    if (plan.budget && venue.budget && venue.budget !== plan.budget) return false;
    
    // Open at requested time (if hours available)
    if (plan.time && venue.hours) {
      if (!isOpenAt(venue.hours, plan.date, plan.time)) return false;
    }
    
    // Distance filter (max 5km for city center, 10km for suburbs)
    const distance = calculateDistance(meetingPoint, venue.location);
    const maxDistance = plan.area === 'city-center' ? 5000 : 10000;
    if (distance > maxDistance) return false;
    
    return true;
  });
}
```

#### Step 3: Score Venues

```typescript
interface VenueScore {
  venue: Venue;
  distanceScore: number;
  ratingScore: number;
  preferenceScore: number;
  partnerBonus: number;
  totalScore: number;
}

function scoreVenues(
  venues: Venue[],
  meetingPoint: Point,
  plan: Plan,
  participants: Participant[],
  isPartner: (venueId: string) => boolean,
): VenueScore[] {
  const maxDistance = 10000; // 10km
  const aggregatedPrefs = aggregatePreferences(participants);
  
  return venues.map(venue => {
    // Distance score (40% weight)
    const distance = calculateDistance(meetingPoint, venue.location);
    const distanceScore = Math.max(0, 1 - (distance / maxDistance));
    
    // Rating score (30% weight)
    const ratingScore = venue.rating 
      ? Math.max(0, Math.min(1, (venue.rating - 3.0) / 2.0)) // Normalize 3-5 to 0-1
      : 0.5; // Neutral if no rating
    
    // Preference match (20% weight)
    let preferenceScore = 0;
    if (venue.categories.some(cat => aggregatedPrefs.cuisine.includes(cat))) {
      preferenceScore += 0.1;
    }
    if (venue.budget === plan.budget) {
      preferenceScore += 0.1;
    }
    // Add more preference matching logic
    
    // Partner bonus (10% weight)
    const partnerBonus = isPartner(venue.id) ? 0.1 : 0;
    
    // Total score (weighted sum)
    const totalScore = 
      (distanceScore * 0.4) +
      (ratingScore * 0.3) +
      (preferenceScore * 0.2) +
      partnerBonus;
    
    return {
      venue,
      distanceScore,
      ratingScore,
      preferenceScore,
      partnerBonus,
      totalScore,
    };
  });
}
```

#### Step 4: Rank and Select Top 5

```typescript
function selectTop5(scoredVenues: VenueScore[]): Venue[] {
  // Sort by total score (descending)
  const sorted = scoredVenues.sort((a, b) => b.totalScore - a.totalScore);
  
  // Ensure diversity: max 2 from same category
  const selected: Venue[] = [];
  const categoryCounts: Record<string, number> = {};
  
  for (const scored of sorted) {
    if (selected.length >= 5) break;
    
    const primaryCategory = scored.venue.categories[0];
    const count = categoryCounts[primaryCategory] || 0;
    
    if (count < 2) {
      selected.push(scored.venue);
      categoryCounts[primaryCategory] = count + 1;
    }
  }
  
  // Fill remaining slots if needed
  if (selected.length < 5) {
    for (const scored of sorted) {
      if (selected.length >= 5) break;
      if (!selected.includes(scored.venue)) {
        selected.push(scored.venue);
      }
    }
  }
  
  return selected.slice(0, 5);
}
```

### Complete Function

```typescript
async function generateShortlist(
  plan: Plan,
  participants: Participant[],
  venueRepository: VenueRepository,
  partnerService: PartnerService,
): Promise<Venue[]> {
  // Step 1: Calculate meeting point
  const meetingPoint = calculateMeetingPoint(plan, participants);
  
  // Step 2: Filter venues
  const allVenues = await venueRepository.findByCity(plan.city_id);
  const filtered = filterVenues(plan.city_id, meetingPoint, plan, allVenues);
  
  // Step 3: Score venues
  const scored = scoreVenues(
    filtered,
    meetingPoint,
    plan,
    participants,
    (venueId) => partnerService.isPartner(venueId),
  );
  
  // Step 4: Select top 5
  return selectTop5(scored);
}
```

## 2. Preference Aggregation

Aggregate participant preferences for shortlist generation.

```typescript
interface AggregatedPreferences {
  format: string;
  budget: string;
  cuisine: string[];
  alcohol: 'yes' | 'no' | 'neutral';
  quiet: boolean;
  outdoor: boolean;
  kidsFriendly: boolean;
}

function aggregatePreferences(participants: Participant[]): AggregatedPreferences {
  if (participants.length === 0) {
    return getDefaultPreferences();
  }
  
  // Format: use plan format (majority wins if conflicts)
  const formats = participants.map(p => p.preferences?.format).filter(Boolean);
  const format = getMostCommon(formats) || 'dinner';
  
  // Budget: use plan budget or average
  const budgets = participants.map(p => p.preferences?.budget).filter(Boolean);
  const budget = getMostCommon(budgets) || '$$';
  
  // Cuisine: union of all participant cuisines
  const cuisineSets = participants
    .map(p => p.preferences?.cuisine || [])
    .filter(arr => arr.length > 0);
  const cuisine = [...new Set(cuisineSets.flat())];
  
  // Boolean preferences: majority vote
  const alcoholVotes = participants
    .map(p => p.preferences?.alcohol)
    .filter(Boolean);
  const alcohol = getMajorityVote(alcoholVotes, 'neutral');
  
  const quietVotes = participants
    .map(p => p.preferences?.quiet)
    .filter(Boolean);
  const quiet = getMajorityVote(quietVotes, false) === true;
  
  // Similar for outdoor, kidsFriendly
  
  return {
    format,
    budget,
    cuisine,
    alcohol,
    quiet,
    outdoor: false, // Calculate similarly
    kidsFriendly: false, // Calculate similarly
  };
}

function getMostCommon<T>(items: T[]): T | null {
  if (items.length === 0) return null;
  const counts = new Map<T, number>();
  items.forEach(item => {
    counts.set(item, (counts.get(item) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])[0][0];
}

function getMajorityVote<T>(votes: T[], default: T): T {
  if (votes.length === 0) return default;
  return getMostCommon(votes) || default;
}
```

## 3. Voting Mechanism

### Voting Rules

- One vote per participant per voting session
- Vote cannot be changed once cast
- Voting session duration: configurable (default: 2 hours from plan creation or shortlist generation)
- Winner: venue with most votes
- Tie-breaking: highest score from shortlist generation

### Vote Counting

```typescript
interface VoteResult {
  venueId: string;
  voteCount: number;
  score: number; // From shortlist generation
}

function countVotes(
  voteCasts: VoteCast[],
  shortlistScores: Map<string, number>,
): VoteResult[] {
  const voteCounts = new Map<string, number>();
  
  // Count votes per venue
  voteCasts.forEach(vote => {
    voteCounts.set(vote.venue_id, (voteCounts.get(vote.venue_id) || 0) + 1);
  });
  
  // Convert to results with scores
  const results: VoteResult[] = Array.from(voteCounts.entries()).map(([venueId, count]) => ({
    venueId,
    voteCount: count,
    score: shortlistScores.get(venueId) || 0,
  }));
  
  return results.sort((a, b) => {
    // Primary sort: vote count (descending)
    if (b.voteCount !== a.voteCount) {
      return b.voteCount - a.voteCount;
    }
    // Tie-breaking: score (descending)
    return b.score - a.score;
  });
}

function determineWinner(voteResults: VoteResult[]): string | null {
  if (voteResults.length === 0) return null;
  return voteResults[0].venueId;
}
```

### Timeout Handling

```typescript
async function handleVotingTimeout(planId: string): Promise<void> {
  const plan = await planRepository.findOne(planId);
  const vote = await voteRepository.findByPlanId(planId);
  const voteCasts = await voteCastRepository.findByVoteId(vote.id);
  
  if (voteCasts.length === 0) {
    // No votes cast: recommend top-scored venue
    const shortlist = await getShortlist(planId);
    const topVenue = shortlist[0]; // Highest scored
    
    await planRepository.update(planId, {
      status: 'closed',
      winning_venue_id: topVenue.id,
    });
    
    // Notify participants: recommend top venue, offer revote
    await notifyParticipants(planId, {
      type: 'timeout_no_votes',
      recommendedVenue: topVenue,
      offerRevote: true,
    });
  } else {
    // Votes cast: determine winner normally
    const results = countVotes(voteCasts, getShortlistScores(planId));
    const winner = determineWinner(results);
    
    await planRepository.update(planId, {
      status: 'closed',
      winning_venue_id: winner,
    });
  }
}
```

## 4. Ranking Formula (Search/List)

For general venue search/list endpoints (not plan-specific).

```typescript
function rankVenues(
  venues: Venue[],
  userLocation?: Point,
  isPartner: (venueId: string) => boolean,
): Venue[] {
  return venues
    .map(venue => {
      let score = 0;
      
      // Distance score (50% if location provided)
      if (userLocation) {
        const distance = calculateDistance(userLocation, venue.location);
        const maxDistance = 10000; // 10km
        const distanceScore = Math.max(0, 1 - (distance / maxDistance));
        score += distanceScore * 0.5;
      }
      
      // Rating score (30%)
      const ratingScore = venue.rating
        ? Math.max(0, Math.min(1, (venue.rating - 3.0) / 2.0))
        : 0.5; // Neutral if no rating
      score += ratingScore * 0.3;
      
      // Partner boost (20%)
      const partnerBoost = isPartner(venue.id) ? 1.0 : 0.0;
      score += partnerBoost * 0.2;
      
      // Open now bonus (if applicable)
      if (isOpenNow(venue.hours)) {
        score += 0.1;
      }
      
      return { venue, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(item => item.venue);
}
```

## 5. Midpoint Calculation

Calculate geographic midpoint between participant locations.

```typescript
function calculateMidpoint(locations: Point[]): Point {
  if (locations.length === 0) {
    throw new Error('Cannot calculate midpoint: no locations provided');
  }
  
  if (locations.length === 1) {
    return locations[0];
  }
  
  // Simple centroid (for small distances, this is accurate enough)
  const avgLat = locations.reduce((sum, l) => sum + l.lat, 0) / locations.length;
  const avgLng = locations.reduce((sum, l) => sum + l.lng, 0) / locations.length;
  
  return { lat: avgLat, lng: avgLng };
}

// For larger distances, use geographic midpoint formula
function calculateGeographicMidpoint(locations: Point[]): Point {
  // Convert to radians
  const radLats = locations.map(l => l.lat * Math.PI / 180);
  const radLngs = locations.map(l => l.lng * Math.PI / 180);
  
  // Calculate weighted average
  const x = radLats.reduce((sum, lat) => sum + Math.cos(lat), 0) / locations.length;
  const y = radLats.reduce((sum, lat) => sum + Math.sin(lat), 0) / locations.length;
  const z = radLngs.reduce((sum, lng) => sum + lng, 0) / locations.length;
  
  const midLat = Math.atan2(y, x) * 180 / Math.PI;
  const midLng = z * 180 / Math.PI;
  
  return { lat: midLat, lng: midLng };
}
```

## References

- See [`docs/FINAL-SPEC.md`](FINAL-SPEC.md) Section 13 for algorithm overview
- See [`docs/DATABASE.md`](DATABASE.md) for data model and queries
- See [`docs/API.md`](API.md) for API endpoints using these algorithms
