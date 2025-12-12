# Excel Upload Optimization Plan

## Current Implementation Analysis

### Current Flow:
1. **File Reading**: Read entire Excel file into memory
2. **Data Parsing**: Parse all rows into array
3. **Row Processing**: Loop through each row sequentially
   - Map headers to fields
   - Apply field truncation (large switch statement)
   - Validate required fields
   - Build `tendersToImport` array
4. **Import Loop**: Process each tender sequentially
   - Check duplicates (fetches ALL tenders for each check)
   - Create tender (individual API call per tender)
   - Update progress state on every iteration

### Performance Issues Identified:

#### 🔴 Critical Issues:
1. **Sequential Processing**: Each tender processed one-by-one (blocking)
2. **Duplicate Check N+1 Problem**: Fetches all tenders from DB for EACH duplicate check
3. **No Batch Operations**: Each tender = separate API call
4. **User Lookup in Loop**: Linear search through users array for each row
5. **Progress Updates**: State update on every iteration (causes re-renders)

#### 🟡 Medium Issues:
1. **Large Switch Statement**: Repetitive truncation logic (9 cases)
2. **No Early Validation**: All rows processed before validation
3. **Limited Error Context**: Errors don't show which column failed
4. **No Date Validation**: Dates not validated before import
5. **No Number Validation**: Amount fields not validated
6. **Memory Usage**: Entire file loaded into memory

#### 🟢 Minor Issues:
1. **No Preview**: Users can't see data before importing
2. **No Warnings**: Only errors shown, no warnings for truncations
3. **Error Display**: Long error strings in single line
4. **No Retry**: Failed rows can't be retried individually

---

## Optimization Strategy

### Phase 1: Performance Optimizations (High Priority)

#### 1.1 Batch Duplicate Check
**Current**: Check duplicates individually for each tender (N queries)
**Optimized**: Fetch all existing IDs once, check in memory

```typescript
// Before: N queries (one per tender)
for (let i = 0; i < tendersToImport.length; i++) {
  const duplicateCheck = await tenderService.checkDuplicateIds(...)
}

// After: 1 query, check in memory
const existingTenders = await tenderService.getAllTenderIds(companyId)
const duplicateMap = new Map() // Map for O(1) lookup
// Check all duplicates in memory
```

**Impact**: Reduces N database queries to 1 query
**Estimated Speedup**: 10-50x for 100 tenders

#### 1.2 Batch Tender Creation
**Current**: Create tenders one-by-one (N API calls)
**Optimized**: Create tenders in batches (e.g., 50 at a time)

```typescript
// Create batch insert function in tenderService
async createTendersBatch(companyId: string, userId: string, tenders: TenderFormData[]): Promise<Tender[]>
```

**Impact**: Reduces N API calls to N/50 API calls
**Estimated Speedup**: 10-20x for 100 tenders

#### 1.3 Optimize User Lookup
**Current**: Linear search through users array for each row
**Optimized**: Create Map for O(1) lookup

```typescript
// Before: O(n) for each row
const user = users.find(u => u.email?.toLowerCase() === value.toLowerCase())

// After: O(1) lookup
const userMap = new Map([
  ...users.map(u => [u.email?.toLowerCase(), u]),
  ...users.map(u => [u.full_name?.toLowerCase(), u])
])
const user = userMap.get(value.toLowerCase())
```

**Impact**: Reduces O(n*m) to O(n+m) where n=rows, m=users
**Estimated Speedup**: 5-10x for large user lists

#### 1.4 Throttle Progress Updates
**Current**: Update progress state on every iteration
**Optimized**: Update every N items or use requestAnimationFrame

```typescript
// Update progress every 10 items or every 100ms
let lastUpdate = 0
if (i % 10 === 0 || Date.now() - lastUpdate > 100) {
  setImportProgress(...)
  lastUpdate = Date.now()
}
```

**Impact**: Reduces React re-renders
**Estimated Speedup**: Smoother UI, less blocking

#### 1.5 Parallel Processing (Optional)
**Current**: Sequential processing
**Optimized**: Process in chunks with Promise.all

```typescript
// Process in chunks of 10 in parallel
const chunkSize = 10
for (let i = 0; i < tendersToImport.length; i += chunkSize) {
  const chunk = tendersToImport.slice(i, i + chunkSize)
  await Promise.all(chunk.map(tender => createTender(...)))
}
```

**Impact**: Parallel API calls (if database supports)
**Estimated Speedup**: 2-5x (limited by database connection pool)

---

### Phase 2: Code Quality Improvements (Medium Priority)

#### 2.1 Refactor Field Truncation
**Current**: Large switch statement with repetitive code
**Optimized**: Configuration-driven truncation

```typescript
// Field configuration
const FIELD_LIMITS = {
  tender_name: { maxLength: 500, type: 'string' },
  tender247_id: { maxLength: 100, type: 'string' },
  gem_eprocure_id: { maxLength: 100, type: 'string' },
  location: { maxLength: 255, type: 'string' },
  source: { maxLength: 100, type: 'string' },
  tender_type: { maxLength: 100, type: 'string' },
  portal_link: { maxLength: 2000, type: 'string' },
  tender_notes: { maxLength: 10000, type: 'string' },
  pq_criteria: { maxLength: 10000, type: 'string' }
}

// Truncate function
const truncateField = (fieldName: string, value: string): { value: string; truncated: boolean } => {
  const limit = FIELD_LIMITS[fieldName]?.maxLength
  if (limit && value.length > limit) {
    return { value: value.substring(0, limit), truncated: true }
  }
  return { value, truncated: false }
}
```

**Impact**: Cleaner code, easier to maintain, consistent behavior

#### 2.2 Extract Validation Functions
**Current**: Validation logic mixed with processing
**Optimized**: Separate validation functions

```typescript
// Validation functions
const validateTenderName = (name: string): ValidationResult => { ... }
const validateDate = (dateStr: string, fieldName: string): ValidationResult => { ... }
const validateAmount = (amount: string, fieldName: string): ValidationResult => { ... }
const validateStatus = (status: string): ValidationResult => { ... }
const validateSource = (source: string): ValidationResult => { ... }
```

**Impact**: Reusable, testable, clearer error messages

#### 2.3 Improve Error Reporting
**Current**: Generic error messages
**Optimized**: Detailed error context

```typescript
interface ValidationError {
  row: number
  field: string
  value: any
  message: string
  severity: 'error' | 'warning'
}

// Example: "Row 5, Column 'Last Date': Invalid date format '2024-13-45'. Expected format: YYYY-MM-DD"
```

**Impact**: Better user experience, easier debugging

---

### Phase 3: Data Validation Enhancements (Medium Priority)

#### 3.1 Date Validation
**Current**: Dates accepted as-is, may cause DB errors
**Optimized**: Validate and normalize dates

```typescript
const parseDate = (dateStr: string): { valid: boolean; date?: string; error?: string } => {
  // Handle multiple formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Excel serial dates
  // Return ISO format or error
}
```

**Impact**: Prevents database errors, better data quality

#### 3.2 Number Validation
**Current**: Amount fields not validated
**Optimized**: Validate and format amounts

```typescript
const parseAmount = (amountStr: string): { valid: boolean; amount?: string; error?: string } => {
  // Remove currency symbols, commas
  // Validate is numeric
  // Return formatted decimal string
}
```

**Impact**: Prevents invalid data, consistent formatting

#### 3.3 Status and Source Validation
**Current**: Any string accepted
**Optimized**: Validate against allowed values

```typescript
const ALLOWED_STATUSES = ['new', 'assigned', 'under-study', ...]
const ALLOWED_SOURCES = ['tender247', 'gem', 'nprocure', 'eprocure', 'other']

const validateStatus = (status: string): ValidationResult => {
  if (!ALLOWED_STATUSES.includes(status.toLowerCase())) {
    return { valid: false, error: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}` }
  }
  return { valid: true }
}
```

**Impact**: Prevents invalid enum values, better data integrity

---

### Phase 4: User Experience Improvements (Low Priority)

#### 4.1 Data Preview
**Feature**: Show parsed data in table before import
**Implementation**: Parse file, show preview modal with editable table
**Impact**: Users can review and correct data before import

#### 4.2 Warnings Display
**Feature**: Show warnings separately from errors
**Implementation**: Track warnings (truncations, format issues) separately
**Impact**: Users know about data modifications

#### 4.3 Error Summary
**Feature**: Group errors by type, show summary
**Implementation**: Categorize errors (validation, duplicate, network, etc.)
**Impact**: Easier to understand and fix issues

#### 4.4 Partial Import
**Feature**: Allow importing only valid rows
**Implementation**: Checkbox to skip rows with errors
**Impact**: Don't lose valid data due to a few errors

---

## Implementation Plan

### Step 1: Create Helper Functions (30 min)
- [ ] Create `FIELD_LIMITS` configuration
- [ ] Create `truncateField` function
- [ ] Create `parseDate` function
- [ ] Create `parseAmount` function
- [ ] Create validation functions

### Step 2: Optimize Duplicate Check (45 min)
- [ ] Create `getAllTenderIds` function in `tenderService`
- [ ] Refactor duplicate check to use in-memory Map
- [ ] Test with large datasets

### Step 3: Implement Batch Creation (60 min)
- [ ] Create `createTendersBatch` function in `tenderService`
- [ ] Update import loop to use batches
- [ ] Handle batch errors gracefully

### Step 4: Optimize User Lookup (15 min)
- [ ] Create user Map at start of import
- [ ] Replace `users.find()` with Map lookup

### Step 5: Throttle Progress Updates (15 min)
- [ ] Implement throttling logic
- [ ] Test UI responsiveness

### Step 6: Refactor Field Processing (30 min)
- [ ] Replace switch statement with configuration-driven approach
- [ ] Add warning tracking for truncations

### Step 7: Add Data Validation (45 min)
- [ ] Add date validation
- [ ] Add amount validation
- [ ] Add status/source validation
- [ ] Update error messages

### Step 8: Testing (30 min)
- [ ] Test with small file (10 rows)
- [ ] Test with large file (1000 rows)
- [ ] Test with invalid data
- [ ] Test with duplicates
- [ ] Test error handling

---

## Expected Performance Improvements

### Before Optimization:
- **100 tenders**: ~60-120 seconds
- **1000 tenders**: ~10-20 minutes
- **Database queries**: 200+ (100 duplicate checks + 100 creates)
- **Memory**: High (entire file + all tenders loaded)

### After Optimization:
- **100 tenders**: ~5-10 seconds (6-12x faster)
- **1000 tenders**: ~1-2 minutes (10x faster)
- **Database queries**: ~25 (1 duplicate check + 20 batch creates)
- **Memory**: Optimized (chunked processing)

---

## Risk Assessment

### Low Risk:
- Helper function extraction
- User lookup optimization
- Progress throttling
- Field truncation refactor

### Medium Risk:
- Batch creation (need to handle partial failures)
- Duplicate check optimization (need to ensure accuracy)

### High Risk:
- Parallel processing (database connection limits)
- Large file streaming (complexity)

---

## Recommendations

### Must Do (Phase 1):
1. ✅ Batch duplicate check
2. ✅ Batch tender creation
3. ✅ Optimize user lookup
4. ✅ Throttle progress updates

### Should Do (Phase 2 & 3):
1. ✅ Refactor field truncation
2. ✅ Add data validation
3. ✅ Improve error reporting

### Nice to Have (Phase 4):
1. ⚠️ Data preview (if time permits)
2. ⚠️ Warnings display
3. ⚠️ Error summary

---

## Files to Modify

1. **`src/pages/Tenders.tsx`**
   - Refactor `handleImportExcel` function
   - Add helper functions
   - Update progress tracking

2. **`src/services/tenderService.ts`**
   - Add `getAllTenderIds` function
   - Add `createTendersBatch` function

3. **`src/utils/excelImportHelpers.ts`** (NEW)
   - Field limits configuration
   - Truncation functions
   - Validation functions
   - Date/amount parsing functions

---

## Testing Checklist

- [ ] Import 10 valid tenders
- [ ] Import 100 valid tenders
- [ ] Import with duplicate IDs
- [ ] Import with invalid dates
- [ ] Import with invalid amounts
- [ ] Import with invalid status
- [ ] Import with missing required fields
- [ ] Import with truncated fields
- [ ] Import with invalid user assignments
- [ ] Import empty file
- [ ] Import file with only headers
- [ ] Import file with mixed valid/invalid rows
- [ ] Verify progress updates
- [ ] Verify error messages
- [ ] Verify success count

---

## Notes

- Batch size should be configurable (default: 50)
- Consider adding transaction support for batch operations
- May need to handle database timeouts for very large batches
- Consider adding import history/audit log
- Consider adding ability to export failed rows for correction

