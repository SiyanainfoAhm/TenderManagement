# Task Timeline - Full Implementation Plan

## Current State Analysis

### ✅ What's Already Built
1. **UI Components**:
   - Calendar View (month/year views)
   - Gantt Chart View (week/month zoom)
   - Tender Summary Drawer
   - Filter UI (users, search, date range)
   - View switcher (Calendar/Gantt)

2. **Features**:
   - Filter by assigned users
   - Search by tender ID/name
   - Date range filtering
   - Tender click to view details
   - Responsive design

### ❌ What's Missing
1. **Data Integration**:
   - Currently uses mock data from `@/mocks/timeline`
   - No connection to real tender database
   - No connection to real user data
   - No authentication/company context

2. **Data Mapping Issues**:
   - Mock data structure doesn't match real tender structure
   - Missing date field handling (expected_start_date, expected_end_date)
   - User ID mapping needs implementation

3. **Functionality Gaps**:
   - Drawer "Open Tender Details" link may not work correctly
   - No loading states
   - No error handling
   - No empty states

---

## Implementation Plan

### Phase 1: Data Integration (Priority: HIGH)

#### 1.1 Replace Mock Data with Real Data
**Files to Modify:**
- `src/pages/task-timeline/page.tsx`

**Tasks:**
- [ ] Import `useAuth` hook to get company context
- [ ] Import `tenderService` to fetch real tenders
- [ ] Import user service to fetch company users
- [ ] Replace `timelineTenders` mock with real data fetch
- [ ] Replace `timelineUsers` mock with real company users
- [ ] Add loading states
- [ ] Add error handling

**Data Mapping:**
```typescript
// Mock Structure → Real Structure
TimelineTender {
  id → Tender.id
  tenderId → Tender.tender247_id || Tender.gem_eprocure_id
  tenderName → Tender.tender_name
  gemId → Tender.gem_eprocure_id || Tender.tender247_id
  estimatedStartDate → Tender.expected_start_date || calculated
  estimatedEndDate → Tender.expected_end_date || calculated
  assignedTo → Tender.assigned_to (user ID)
  status → Tender.status
}
```

#### 1.2 Handle Date Calculations
**Logic:**
- If `expected_start_date` exists → use it
- If `expected_end_date` exists → use it
- If only `expected_days` exists → calculate from `last_date` or `created_at`
- Fallback: Use `last_date` as end date, calculate start from `expected_days`
- If no dates: Skip tender or use `created_at` as fallback

**Implementation:**
```typescript
function calculateTenderDates(tender: Tender) {
  let startDate: string | null = null
  let endDate: string | null = null

  if (tender.expected_start_date) {
    startDate = tender.expected_start_date
  } else if (tender.expected_days && tender.last_date) {
    // Calculate start from end date and duration
    const end = new Date(tender.last_date)
    const start = new Date(end)
    start.setDate(start.getDate() - (tender.expected_days || 0))
    startDate = start.toISOString().split('T')[0]
  } else if (tender.created_at) {
    // Fallback to creation date
    startDate = tender.created_at.split('T')[0]
  }

  if (tender.expected_end_date) {
    endDate = tender.expected_end_date
  } else if (tender.last_date) {
    endDate = tender.last_date
  } else if (tender.expected_days && startDate) {
    // Calculate end from start date and duration
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + (tender.expected_days || 0))
    endDate = end.toISOString().split('T')[0]
  } else if (startDate) {
    // Default to 30 days if no end date
    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + 30)
    endDate = end.toISOString().split('T')[0]
  }

  return { startDate, endDate }
}
```

#### 1.3 User Data Integration
**Tasks:**
- [ ] Fetch company users using user service
- [ ] Map user IDs to user names for display
- [ ] Handle cases where `assigned_to` is null
- [ ] Show "Unassigned" for tenders without assignment

---

### Phase 2: Service Layer (Priority: HIGH)

#### 2.1 Create Timeline Service (Optional)
**File:** `src/services/timelineService.ts` (if needed)

**Purpose:**
- Centralize timeline-specific data transformations
- Handle date calculations
- Filter tenders for timeline view

**Functions:**
```typescript
export const timelineService = {
  // Transform tender to timeline format
  transformTenderToTimeline(tender: TenderWithUser): TimelineTender,
  
  // Calculate dates for tender
  calculateTenderDates(tender: Tender): { startDate: string | null, endDate: string | null },
  
  // Filter tenders for timeline (only those with valid dates)
  filterTendersForTimeline(tenders: TenderWithUser[]): TimelineTender[]
}
```

---

### Phase 3: UI Enhancements (Priority: MEDIUM)

#### 3.1 Loading States
**Tasks:**
- [ ] Add loading spinner while fetching tenders
- [ ] Add loading state for user filter dropdown
- [ ] Show skeleton loaders for calendar/gantt views

#### 3.2 Error Handling
**Tasks:**
- [ ] Display error message if data fetch fails
- [ ] Add retry button on error
- [ ] Handle empty states (no tenders, no users)

#### 3.3 Empty States
**Tasks:**
- [ ] Show message when no tenders match filters
- [ ] Show message when no tenders have valid dates
- [ ] Provide helpful actions (clear filters, add tender)

#### 3.4 Navigation Fix
**Tasks:**
- [ ] Fix drawer "Open Tender Details" link
- [ ] Use React Router navigation instead of `window.location`
- [ ] Pass correct tender ID parameter

---

### Phase 4: Data Filtering & Performance (Priority: MEDIUM)

#### 4.1 Optimize Data Fetching
**Tasks:**
- [ ] Only fetch tenders with valid dates for timeline
- [ ] Add date range filter to API query
- [ ] Implement pagination if needed (for large datasets)
- [ ] Cache user data

#### 4.2 Filter Enhancements
**Tasks:**
- [ ] Add status filter
- [ ] Add source filter
- [ ] Add location/city filter
- [ ] Remember filter preferences (localStorage)

---

### Phase 5: Advanced Features (Priority: LOW)

#### 5.1 Interactive Features
**Tasks:**
- [ ] Drag to update dates in Gantt view
- [ ] Click to edit tender dates inline
- [ ] Color coding by status
- [ ] Show milestones/deadlines

#### 5.2 Export & Sharing
**Tasks:**
- [ ] Export timeline as image (PNG/PDF)
- [ ] Share timeline view URL
- [ ] Print-friendly view

#### 5.3 Notifications
**Tasks:**
- [ ] Highlight overdue tenders
- [ ] Show upcoming deadlines
- [ ] Warning for overlapping assignments

---

## Implementation Steps

### Step 1: Basic Data Integration (2-3 hours)
1. Update `page.tsx` to use `useAuth` and fetch real data
2. Create data transformation function
3. Handle date calculations
4. Test with real data

### Step 2: User Integration (1 hour)
1. Fetch company users
2. Map user IDs to names
3. Update filter dropdown
4. Handle unassigned tenders

### Step 3: UI Polish (1-2 hours)
1. Add loading states
2. Add error handling
3. Add empty states
4. Fix navigation

### Step 4: Testing & Refinement (1-2 hours)
1. Test with various data scenarios
2. Test edge cases (missing dates, null users)
3. Performance testing
4. UI/UX improvements

---

## Data Flow Diagram

```
User Opens Timeline Page
    ↓
Fetch Company Tenders (tenderService.getTenders)
    ↓
Fetch Company Users (userService.getUsers)
    ↓
Transform Tenders to Timeline Format
    ├─ Calculate Dates (expected_start_date/end_date or fallback)
    ├─ Map User IDs to Names
    └─ Filter Tenders with Valid Dates
    ↓
Display in Calendar/Gantt View
    ↓
User Interacts (filter, search, click)
    ↓
Update Filtered Tenders
    ↓
Re-render View
```

---

## Edge Cases to Handle

1. **Missing Dates:**
   - Tender has no `expected_start_date` or `expected_end_date`
   - Solution: Calculate from `expected_days` or use fallback dates

2. **Null Assigned User:**
   - Tender has `assigned_to = null`
   - Solution: Show "Unassigned" in filters and display

3. **Invalid Date Ranges:**
   - Start date after end date
   - Solution: Swap dates or use single date

4. **No Tenders:**
   - Company has no tenders
   - Solution: Show empty state with helpful message

5. **No Users:**
   - Company has no users
   - Solution: Show all tenders, hide user filter

6. **Large Datasets:**
   - Many tenders causing performance issues
   - Solution: Implement pagination or virtual scrolling

---

## Testing Checklist

- [ ] Timeline loads with real tender data
- [ ] Calendar view displays tenders correctly
- [ ] Gantt view displays tenders correctly
- [ ] User filter works
- [ ] Search filter works
- [ ] Date range filter works
- [ ] Tender click opens drawer
- [ ] Drawer shows correct tender details
- [ ] "Open Tender Details" navigates correctly
- [ ] Loading states show during fetch
- [ ] Error states display on failure
- [ ] Empty states show when no data
- [ ] Handles missing dates gracefully
- [ ] Handles unassigned tenders
- [ ] Performance is acceptable with 100+ tenders

---

## Estimated Time

- **Phase 1 (Data Integration):** 3-4 hours
- **Phase 2 (Service Layer):** 1-2 hours (optional)
- **Phase 3 (UI Enhancements):** 2-3 hours
- **Phase 4 (Performance):** 1-2 hours
- **Phase 5 (Advanced Features):** 4-6 hours (future)

**Total for MVP (Phases 1-3):** 6-9 hours
**Total for Full Implementation:** 11-17 hours

---

## Priority Order

1. **CRITICAL:** Replace mock data with real data (Phase 1.1)
2. **CRITICAL:** Handle date calculations (Phase 1.2)
3. **HIGH:** User data integration (Phase 1.3)
4. **HIGH:** Fix navigation (Phase 3.4)
5. **MEDIUM:** Loading/error states (Phase 3.1-3.2)
6. **MEDIUM:** Empty states (Phase 3.3)
7. **LOW:** Advanced features (Phase 5)

---

## Notes

- The timeline should only show tenders that have valid date ranges
- Consider adding a toggle to show/hide tenders without dates
- The Gantt view timeline calculation may need adjustment for better visualization
- Consider adding tooltips with more tender information on hover
- Status colors should match the tender status colors used elsewhere in the app

