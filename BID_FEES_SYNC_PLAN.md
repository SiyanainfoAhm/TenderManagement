# Bid Fees Sync Logic Implementation Plan

## Current Behavior Analysis

### 1. Add Tender (`tenderService.createTender`)
- **Current**: After creating tender, calls `syncTenderAmountsToBidFees` which:
  - Uses `getOrCreateBidFee` to create bid fees if they don't exist
  - Updates bid fees with tender amounts (tender_fees and emd_amount)
- **Issue**: Creates bid fees automatically even when not needed

### 2. Update Tender (`tenderService.updateTender`)
- **Current**: After updating tender, calls `syncTenderAmountsToBidFees` which:
  - Uses `getOrCreateBidFee` to create bid fees if they don't exist
  - Updates bid fees with tender amounts
- **Issue**: Creates new bid fees if they don't exist, should only update existing ones

### 3. Add Fees (Bid Fees Page - `handleSaveFees`)
- **Current**: 
  - Default amounts come from tender table (✅ already correct)
  - Calls `bidFeeService.createBidFees` which uses `getOrCreateBidFee` and updates
  - After update, calls `syncBidFeeToTender` to sync back to tender table (✅ already correct)
- **Status**: ✅ Works correctly - no changes needed

### 4. Update Fees (Bid Fees Page - `handleUpdateFee`)
- **Current**:
  - Calls `bidFeeService.updateBidFee` which updates bid fee
  - After update, calls `syncBidFeeToTender` to sync back to tender table (✅ already correct)
- **Status**: ✅ Works correctly - no changes needed

## Required Changes

### Change 1: Remove Bid Fee Creation from Add Tender
**File**: `src/services/tenderService.ts`
**Function**: `createTender`
**Action**: Remove the entire `syncTenderAmountsToBidFees` call (lines 251-268)
**Result**: No bid fees will be created when adding a new tender

### Change 2: Update Only Existing Bid Fees in Update Tender
**File**: `src/services/tenderService.ts`
**Function**: `updateTender`
**Action**: Replace `syncTenderAmountsToBidFees` with a new function `updateExistingBidFees` that:
1. Checks if bid fee exists for `tender-fees` type
   - If exists: Update the amount
   - If not exists: Do nothing
2. Checks if bid fee exists for `emd` type
   - If exists: Update the amount
   - If not exists: Do nothing
**Result**: Only existing bid fees will be updated, no new ones created

### Change 3: Ensure Bid Fees Page Syncs Amount Changes to Tender
**File**: `src/services/bidFeeService.ts`
**Function**: `syncBidFeeToTender`
**Status**: ✅ Already implemented correctly
**Action**: No changes needed - this already syncs bid fee amount changes back to tender table

## Implementation Steps

1. **Modify `tenderService.ts`**:
   - Remove `syncTenderAmountsToBidFees` call from `createTender`
   - Create new function `updateExistingBidFees` that only updates existing bid fees
   - Replace `syncTenderAmountsToBidFees` call in `updateTender` with `updateExistingBidFees`

2. **Test Scenarios**:
   - ✅ Add new tender → No bid fees should be created
   - ✅ Update tender with existing bid fees → Bid fees should be updated
   - ✅ Update tender without existing bid fees → No bid fees should be created
   - ✅ Add fees from Bid Fees page → Should sync amount to tender if changed
   - ✅ Update fees from Bid Fees page → Should sync amount to tender if changed

## Code Changes Summary

### File: `src/services/tenderService.ts`

#### Remove from `createTender`:
```typescript
// REMOVE THIS ENTIRE BLOCK (lines 251-268)
try {
  await syncTenderAmountsToBidFees(...)
} catch (syncError: any) {
  console.error('Failed to sync tender amounts to bid fees:', syncError)
}
```

#### Add new function `updateExistingBidFees`:
```typescript
// Helper function to update ONLY existing bid fees (do not create new ones)
async function updateExistingBidFees(
  tenderId: string,
  companyId: string,
  tenderFees: number,
  emdAmount: number,
  tender: Pick<Tender, 'tender_name' | 'tender247_id' | 'gem_eprocure_id'>
): Promise<void> {
  const BID_FEE_TABLE = getTableName('bid_fees')
  const tenderReference = tender.tender247_id || tender.gem_eprocure_id || tender.tender_name

  // Check and update Tender Fees (only if exists)
  const { data: existingTenderFees, error: fetchTenderFeesError } = await supabase
    .from(BID_FEE_TABLE)
    .select('id')
    .eq('tender_id', tenderId)
    .eq('fee_type', 'tender-fees')
    .limit(1)
    .single()

  if (!fetchTenderFeesError && existingTenderFees) {
    const { error: updateTenderFeesError } = await supabase
      .from(BID_FEE_TABLE)
      .update({
        amount: tenderFees,
        tender_reference: tenderReference,
        tender_name_snapshot: tender.tender_name
      })
      .eq('id', existingTenderFees.id)

    if (updateTenderFeesError) {
      console.error('Failed to update existing tender fees:', updateTenderFeesError)
    }
  }

  // Check and update EMD (only if exists)
  const { data: existingEmd, error: fetchEmdError } = await supabase
    .from(BID_FEE_TABLE)
    .select('id')
    .eq('tender_id', tenderId)
    .eq('fee_type', 'emd')
    .limit(1)
    .single()

  if (!fetchEmdError && existingEmd) {
    const { error: updateEmdError } = await supabase
      .from(BID_FEE_TABLE)
      .update({
        amount: emdAmount,
        tender_reference: tenderReference,
        tender_name_snapshot: tender.tender_name
      })
      .eq('id', existingEmd.id)

    if (updateEmdError) {
      console.error('Failed to update existing EMD:', updateEmdError)
    }
  }
}
```

#### Replace in `updateTender`:
```typescript
// REPLACE syncTenderAmountsToBidFees call with updateExistingBidFees
try {
  await updateExistingBidFees(
    tenderId,
    existingTender.company_id,
    parseFloat(formData.tender_fees) || 0,
    parseFloat(formData.emd_amount) || 0,
    {
      tender_name: formData.tender_name,
      tender247_id: formData.tender247_id,
      gem_eprocure_id: formData.gem_eprocure_id
    }
  )
} catch (syncError: any) {
  console.error('Failed to update existing bid fees:', syncError)
  // Don't throw - tender is updated, sync failure is logged
}
```

## Expected Behavior After Implementation

### Scenario 1: Add New Tender
- **Input**: Create tender with `tender_fees = 1000` and `emd_amount = 5000`
- **Expected**: 
  - Tender is created with these amounts
  - NO bid fees are created in bid_fees table
- **Result**: ✅ Tender created, bid_fees table unchanged

### Scenario 2: Update Tender (No Existing Bid Fees)
- **Input**: Update tender with `tender_fees = 2000` and `emd_amount = 6000`
- **Expected**: 
  - Tender amounts are updated
  - NO bid fees are created (since none exist)
- **Result**: ✅ Tender updated, bid_fees table unchanged

### Scenario 3: Update Tender (With Existing Bid Fees)
- **Input**: Tender has existing bid fees, update tender with `tender_fees = 3000` and `emd_amount = 7000`
- **Expected**: 
  - Tender amounts are updated
  - Existing bid fees are updated with new amounts
- **Result**: ✅ Tender updated, existing bid fees updated

### Scenario 4: Add Fees from Bid Fees Page
- **Input**: Select tender, add fees with amount different from tender table
- **Expected**: 
  - Default amount comes from tender table
  - If user changes amount, it syncs back to tender table
- **Result**: ✅ Bid fee created/updated, tender table synced if amount changed

### Scenario 5: Update Fees from Bid Fees Page
- **Input**: Update existing bid fee amount
- **Expected**: 
  - Bid fee is updated
  - Tender table is synced with new amount
- **Result**: ✅ Bid fee updated, tender table synced

