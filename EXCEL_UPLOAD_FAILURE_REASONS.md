# Excel Upload Failure Reasons - Complete List

This document lists **ALL** possible reasons why tenders might not upload when uploading an Excel file.

## ⚠️ Important: All-or-Nothing Validation
The system uses **all-or-nothing validation**. This means:
- **ALL data must be valid** before any upload happens
- If **ANY error** is found, **NO data** will be uploaded
- You must fix **ALL errors** before the upload will succeed

---

## 📋 Category 1: File Structure Errors

### 1.1 Missing Required Headers
**Error**: `Missing required columns: tender name`
- **Reason**: Excel file must have a header row with at least "Tender Name" column
- **Fix**: Ensure your Excel file has a header row with column names

### 1.2 Empty File
**Error**: `Excel file must contain at least a header row and one data row`
- **Reason**: File has only headers or is completely empty
- **Fix**: Add at least one data row below the header row

### 1.3 No Valid Rows
**Error**: `No valid tenders found in the Excel file`
- **Reason**: All rows are empty or invalid
- **Fix**: Ensure at least one row has valid data

### 1.4 Invalid File Format
**Error**: `Please upload a valid Excel file (.xlsx or .xls)`
- **Reason**: File is not in Excel format
- **Fix**: Use .xlsx or .xls format only

---

## 📋 Category 2: Required Field Validation Errors

### 2.1 Missing Tender Name
**Error**: `Row X: Tender Name is required`
- **Reason**: Tender Name column is empty or missing
- **Fix**: Fill in the Tender Name for all rows
- **Note**: This is the ONLY required field

### 2.2 Tender Name Too Short
**Error**: `Row X: Tender Name must be at least 3 characters`
- **Reason**: Tender Name has less than 3 characters
- **Fix**: Ensure Tender Name has at least 3 characters

---

## 📋 Category 3: Date Format Validation Errors

### 3.1 Invalid Date Format
**Error**: `Row X: Last Date: Invalid date format "XX". Expected formats:   DD/MM/YYYY `
- **Reason**: Date is not in one of the accepted formats
- **Accepted Formats**:
  - `DD/MM/YYYY` (e.g., 25/12/2024) 
- **Fix**: Convert dates to one of the accepted formats
- **Fields Affected**: `Last Date`, `Expected Start Date`, `Expected End Date`

### 3.2 Invalid Date Value
**Error**: Date format looks correct but date is invalid (e.g., 12-13-45)
- **Reason**: Date values are out of range
- **Fix**: Ensure dates are valid (e.g., month 1-12, day 1-31)

---

## 📋 Category 4: Amount/Number Validation Errors

### 4.1 Invalid Amount Format
**Error**: `Row X: EMD Amount: Invalid number format "XX"`
- **Reason**: Amount contains non-numeric characters (except currency symbols)
- **Fix**: Use numbers only (currency symbols like ₹, $, €, £, commas are automatically removed)
- **Fields Affected**: `EMD Amount`, `Tender Fees`, `Tender Cost`

### 4.2 Negative Amount
**Error**: `Row X: EMD Amount: Amount cannot be negative`
- **Reason**: Amount is negative
- **Fix**: Use positive numbers only (0 or greater)

### 4.3 Invalid Number
**Error**: Amount cannot be parsed as a number
- **Reason**: Contains invalid characters or format
- **Fix**: Use valid numeric format (e.g., 1000, 1000.50, ₹1,000.50)

---

## 📋 Category 5: Status Validation Errors

### 5.1 Invalid Status Value
**Error**: `Row X: Invalid status "XX". Allowed values: new, assigned, under-study, on-hold, will-bid, pre-bid, wait-for-corrigendum, in-preparation, ready-to-submit, submitted, under-evaluation, qualified, won, not-qualified, not-bidding`
- **Reason**: Status value is not in the allowed list
- **Allowed Statuses**:
  - `new`
  - `assigned`
  - `under-study`
  - `on-hold`
  - `will-bid`
  - `pre-bid`
  - `wait-for-corrigendum`
  - `in-preparation`
  - `ready-to-submit`
  - `submitted`
  - `under-evaluation`
  - `qualified`
  - `won`
  - `not-qualified`
  - `not-bidding`
- **Fix**: Use one of the allowed status values (case-insensitive, spaces converted to hyphens)

---

## 📋 Category 6: Source Validation Errors

### 6.1 Invalid Source Value
**Error**: `Row X: Invalid source "XX". Allowed values: tender247, gem, nprocure, eprocure, other`
- **Reason**: Source value is not in the allowed list
- **Allowed Sources**:
  - `tender247`
  - `gem`
  - `nprocure`
  - `eprocure`
  - `other`
- **Fix**: Use one of the allowed source values (case-insensitive)
- **Note**: Empty source is allowed (will be set to null)

---

## 📋 Category 7: Duplicate ID Errors

### 7.1 Duplicate Tender247 ID
**Error**: `Row X: Tender247 ID "XXXXX" already exists`
- **Reason**: A tender with the same Tender247 ID already exists in the database
- **Fix**: 
  - Use a different Tender247 ID
  - Or delete/update the existing tender with that ID
  - Or leave Tender247 ID empty (if not required)

### 7.2 Duplicate GEM/Eprocure ID
**Error**: `Row X: GEM/Eprocure ID "XXXXX" already exists`
- **Reason**: A tender with the same GEM/Eprocure ID already exists in the database
- **Fix**: 
  - Use a different GEM/Eprocure ID
  - Or delete/update the existing tender with that ID
  - Or leave GEM/Eprocure ID empty (if not required)

### 7.3 Duplicate Check is Case-Insensitive
- **Note**: Duplicate checking is case-insensitive
- Example: "ABC123" and "abc123" are considered duplicates

---

## 📋 Category 8: Database Upload Errors

### 8.1 Batch Insert Failure
**Error**: `Upload failed: [error message]. All X created tenders have been rolled back.`
- **Reason**: Database error during batch insert
- **Possible Causes**:
  - Database connection issue
  - Constraint violation (e.g., foreign key, check constraint)
  - Database timeout
  - Insufficient permissions
- **Fix**: 
  - Check database connection
  - Verify all data meets database constraints
  - Contact administrator if issue persists
- **Note**: All previously created tenders in the batch are automatically rolled back

### 8.2 Individual Tender Creation Failure
**Error**: `Row X: Failed to create tender`
- **Reason**: Specific tender failed to create (after batch validation)
- **Fix**: Check the specific row data for issues

---

## 📋 Category 9: Field Length Warnings (Non-Blocking)

### 9.1 Field Truncation Warnings
**Warning**: `Row X: [Field Name] truncated from X to Y characters`
- **Reason**: Field value exceeds database column limit
- **Fields and Limits**:
  - `Tender Name`: 500 characters
  - `Tender247 ID`: 100 characters
  - `GEM/Eprocure ID`: 100 characters
  - `Location`: 255 characters
  - `Source`: 100 characters
  - `Tender Type`: 100 characters
  - `Portal Link`: 2000 characters
  - `Tender Notes`: 10000 characters
  - `PQ Criteria`: 10000 characters
- **Note**: These are **warnings only** - data will be truncated and upload will continue
- **Fix**: Reduce field length to avoid truncation

---

## 📋 Category 10: User Assignment Warnings (Non-Blocking)

### 10.1 User Not Found
**Warning**: `Row X: User "XXXXX" not found for "Assigned To" field`
- **Reason**: User email or name in "Assigned To" column doesn't exist in the system
- **Fix**: 
  - Use correct user email or full name
  - Or leave "Assigned To" empty
- **Note**: This is a **warning only** - upload will continue with empty assignment

---

## 📋 Category 11: General Processing Errors

### 11.1 Row Processing Error
**Error**: `Row X: Invalid data`
- **Reason**: General error while processing a row
- **Fix**: Check the row data for any obvious issues

### 11.2 Excel File Read Error
**Error**: `Failed to import Excel file`
- **Reason**: Error reading or parsing the Excel file
- **Possible Causes**:
  - Corrupted Excel file
  - Unsupported Excel format
  - File too large
- **Fix**: 
  - Try saving the file again
  - Ensure file is not corrupted
  - Check file size

---

## 🔍 How to Debug Upload Failures

### Step 1: Check Error Message
The error message will show:
- **Row number** where error occurred
- **Field name** that has the error
- **Specific error reason**

### Step 2: Fix All Errors
Remember: **ALL errors must be fixed** before upload will succeed.

### Step 3: Common Fixes
1. **Date Format**: Convert all dates to YYYY-MM-DD format
2. **Status/Source**: Use exact values from allowed list
3. **Duplicates**: Check existing tenders in database
4. **Required Fields**: Ensure Tender Name is filled
5. **Amounts**: Use numbers only (no text)

### Step 4: Validate Before Upload
- Check all dates are in correct format
- Verify status and source values
- Ensure no duplicate IDs
- Confirm Tender Name is present

---

## ✅ Quick Checklist Before Upload

- [ ] Excel file has header row with column names
- [ ] At least one data row exists
- [ ] All rows have "Tender Name" filled (minimum 3 characters)
- [ ] All dates are in YYYY-MM-DD format
- [ ] All amounts are positive numbers
- [ ] All status values are from allowed list
- [ ] All source values are from allowed list
- [ ] No duplicate Tender247 IDs or GEM/Eprocure IDs
- [ ] File is .xlsx or .xls format

---

## 📝 Example Error Messages

### Example 1: Multiple Validation Errors
```
Validation failed. Please fix all errors before uploading. 
Errors (3): 
Row 2: Tender Name is required; 
Row 5: Last Date: Invalid date format "25/12/24". Expected formats:  DD/MM/YYYY, or DD-MM-YYYY; 
Row 8: Invalid status "pending". Allowed values: new, assigned, under-study...
```

### Example 2: Duplicate IDs
```
Duplicate IDs found. Please fix all duplicates before uploading. 
Errors (2): 
Row 3: Tender247 ID "12345" already exists; 
Row 7: GEM/Eprocure ID "GEM123" already exists
```

### Example 3: Upload Failure
```
Upload failed: Database connection error. 
All 10 previously created tenders have been rolled back.
```

---

## 🆘 Need Help?

If you continue to experience issues:
1. Check the specific error message for row and field information
2. Verify your data matches the requirements above
3. Try uploading a single row first to test
4. Contact support with the exact error message

