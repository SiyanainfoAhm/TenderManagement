# Bid Fees - Tender Name Display Logic

## Overview
This document explains when and how tender names are displayed in the "Add Fee" modal's tender search functionality.

---

## 1. Search Mode Selection

### Radio Button Options:
- **"Search by Tender ID"** (`tenderSearchBy === 'id'`)
- **"Search by Tender Name"** (`tenderSearchBy === 'name'`)

**Default:** `'id'` (Search by Tender ID)

**Location:** `src/pages/bid-fees/page.tsx` (Lines 1006-1029)

---

## 2. When Tender Names Are Shown

### ✅ **Tender Names Appear in Dropdown When:**

1. **User Types in Search Input**
   - Input field has a value (not empty)
   - `tenderSearchInput` state has text

2. **Search Mode is "Name"**
   - `tenderSearchBy === 'name'`
   - Filters by `tender.tender_name`

3. **Tender Matches Search Criteria**
   - Tender name contains the search text (case-insensitive)
   - Example: Searching "Test" matches "Test Tender Name"

4. **Tender Status is NOT Excluded**
   - Tender status is NOT one of: `['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']`
   - Only "active" tenders are shown

5. **Dropdown is Visible**
   - `showTenderDropdown === true`
   - `filteredTenders.length > 0`

---

## 3. Filtering Logic

### Function: `handleTenderSearchChange`
**Location:** `src/pages/bid-fees/page.tsx` (Lines 479-509)

```typescript
const handleTenderSearchChange = (value: string) => {
  setTenderSearchInput(value)
  
  // If input is empty, hide dropdown
  if (!value.trim()) {
    setFilteredTenders([])
    setShowTenderDropdown(false)
    return
  }

  // Excluded statuses
  const excludedStatuses = ['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']

  const lowerValue = value.toLowerCase()
  const filtered = tenders.filter(tender => {
    // Step 1: Exclude tenders with excluded statuses
    if (excludedStatuses.includes(tender.status)) {
      return false  // ❌ Don't show this tender
    }

    // Step 2: Filter based on search mode
    if (tenderSearchBy === 'id') {
      // Search in Tender247 ID or GEM/Eprocure ID
      return (
        tender.tender247_id?.toLowerCase().includes(lowerValue) ||
        tender.gem_eprocure_id?.toLowerCase().includes(lowerValue)
      )
    }

    // Search in Tender Name
    return tender.tender_name?.toLowerCase().includes(lowerValue)
  })

  setFilteredTenders(filtered)
  setShowTenderDropdown(true)
}
```

---

## 4. Display Format in Dropdown

### Tender Display Format:
**Location:** `src/pages/bid-fees/page.tsx` (Lines 1040-1052)

```tsx
{filteredTenders.map(tender => (
  <button onClick={() => handleTenderSelect(tender)}>
    <div className="text-sm font-medium text-gray-900">
      {tender.tender247_id || tender.gem_eprocure_id || 'No ID'} - {tender.tender_name}
    </div>
    <div className="text-xs text-gray-500">Status: {tender.status}</div>
  </button>
))}
```

**Format:** `{ID} - {Tender Name}`
- **ID:** Shows `tender247_id` OR `gem_eprocure_id` OR `'No ID'`
- **Tender Name:** Always shows `tender.tender_name`
- **Status:** Shows tender status below

**Example Display:**
```
T247/2024/001 - Test Tender Name
Status: new
```

---

## 5. Status Filtering (Excluded Statuses)

### ❌ **Tenders with These Statuses are NEVER Shown:**

1. `'submitted'` - Tender has been submitted
2. `'ready-to-submit'` - Tender is ready to submit
3. `'under-evaluation'` - Tender is under evaluation
4. `'qualified'` - Tender has been qualified
5. `'won'` - Tender has been won

**Reason:** These tenders are in final stages and should not allow adding new fees.

**Location:** 
- Initial load: `src/pages/bid-fees/page.tsx` (Lines 276-280)
- Search filter: `src/pages/bid-fees/page.tsx` (Lines 488-495)

---

## 6. Search Behavior by Mode

### 🔍 **Mode: "Search by Tender ID"** (`tenderSearchBy === 'id'`)

**Searches In:**
- `tender.tender247_id` (case-insensitive)
- `tender.gem_eprocure_id` (case-insensitive)

**Example:**
- User types: `"T247"`
- Matches: `"T247/2024/001"`, `"T247/2024/002"`, etc.
- **Still shows tender name in dropdown** (for identification)

**Code:**
```typescript
if (tenderSearchBy === 'id') {
  return (
    tender.tender247_id?.toLowerCase().includes(lowerValue) ||
    tender.gem_eprocure_id?.toLowerCase().includes(lowerValue)
  )
}
```

---

### 🔍 **Mode: "Search by Tender Name"** (`tenderSearchBy === 'name'`)

**Searches In:**
- `tender.tender_name` (case-insensitive)

**Example:**
- User types: `"Test"`
- Matches: `"Test Tender Name"`, `"Testing Project"`, etc.

**Code:**
```typescript
return tender.tender_name?.toLowerCase().includes(lowerValue)
```

---

## 7. Dropdown Visibility Logic

### ✅ **Dropdown Shows When:**
```typescript
{showTenderDropdown && filteredTenders.length > 0 && (
  <div className="dropdown">
    {/* Tender list */}
  </div>
)}
```

**Conditions:**
1. `showTenderDropdown === true` (set when user types)
2. `filteredTenders.length > 0` (at least one matching tender)

### ❌ **Dropdown Hides When:**
1. Input is empty (`!value.trim()`)
2. No matching tenders (`filteredTenders.length === 0`)
3. User clicks outside or selects a tender
4. Modal is closed

---

## 8. Initial Tender Loading

### Function: `loadTenders`
**Location:** `src/pages/bid-fees/page.tsx` (Lines 270-286)

```typescript
const loadTenders = useCallback(async () => {
  if (!companyId) return
  setTendersLoading(true)
  setTenderError(null)
  try {
    const data = await tenderService.getTenders(companyId)
    
    // Filter out tenders with excluded statuses
    const excludedStatuses = ['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']
    const filteredData = data.filter(tender => !excludedStatuses.includes(tender.status))
    
    setTenders(filteredData)  // Only active tenders stored in state
  } catch (loadError: any) {
    setTenderError(loadError.message || 'Failed to load tenders')
  } finally {
    setTendersLoading(false)
  }
}, [companyId])
```

**Key Points:**
- Loads ALL tenders from API
- **Immediately filters out excluded statuses**
- Only "active" tenders are stored in `tenders` state
- This ensures excluded tenders never appear in search

---

## 9. Complete Flow Diagram

```
User Opens "Add Fee" Modal
         ↓
Step 1: Select Tender
         ↓
User Selects Search Mode:
  - "Search by Tender ID" OR
  - "Search by Tender Name"
         ↓
User Types in Search Input
         ↓
handleTenderSearchChange() Called
         ↓
Check: Is input empty?
  YES → Hide dropdown, return
  NO  → Continue
         ↓
Filter Tenders:
  1. Exclude statuses: ['submitted', 'ready-to-submit', 'under-evaluation', 'qualified', 'won']
  2. If mode = 'id': Search in tender247_id OR gem_eprocure_id
  3. If mode = 'name': Search in tender_name
         ↓
Set filteredTenders = matching tenders
Set showTenderDropdown = true
         ↓
Dropdown Shows:
  - Format: "{ID} - {Tender Name}"
  - Status shown below
         ↓
User Clicks Tender
         ↓
handleTenderSelect() Called
         ↓
Tender Selected, Proceed to Step 2
```

---

## 10. Summary

### ✅ **Tender Names Are Shown When:**

1. ✅ User selects "Search by Tender Name" mode
2. ✅ User types text in search input
3. ✅ Tender name contains the search text (case-insensitive)
4. ✅ Tender status is NOT excluded (not in final stages)
5. ✅ At least one matching tender found

### ❌ **Tender Names Are NOT Shown When:**

1. ❌ Input is empty
2. ❌ No tenders match the search criteria
3. ❌ Tender has excluded status (`submitted`, `ready-to-submit`, `under-evaluation`, `qualified`, `won`)
4. ❌ Search mode is "ID" and user is searching by ID (but name still displays for identification)

### 📝 **Important Notes:**

- **Tender names ALWAYS appear in dropdown** (for identification), even when searching by ID
- **Status filtering happens at TWO levels:**
  1. Initial load (filters out excluded statuses)
  2. Search filter (double-checks excluded statuses)
- **Search is case-insensitive** (converts both input and tender data to lowercase)
- **Dropdown shows maximum 60 items** (max-h-60 overflow-y-auto)

---

## 11. Code References

| Function/Logic | Location | Lines |
|---------------|----------|-------|
| `handleTenderSearchChange` | `src/pages/bid-fees/page.tsx` | 479-509 |
| `loadTenders` | `src/pages/bid-fees/page.tsx` | 270-286 |
| Dropdown Display | `src/pages/bid-fees/page.tsx` | 1038-1054 |
| Search Mode Radio Buttons | `src/pages/bid-fees/page.tsx` | 1006-1029 |
| Excluded Statuses | `src/pages/bid-fees/page.tsx` | 278, 488 |

---

**Last Updated:** November 2024

