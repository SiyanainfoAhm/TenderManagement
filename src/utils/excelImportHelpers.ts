/**
 * Excel Import Helper Functions
 * Provides utilities for processing and validating Excel import data
 */

// Field length limits based on database column constraints
export const FIELD_LIMITS: Record<string, { maxLength: number; fieldName: string }> = {
  tender_name: { maxLength: 500, fieldName: 'Tender Name' },
  tender247_id: { maxLength: 100, fieldName: 'Tender247 ID' },
  gem_eprocure_id: { maxLength: 100, fieldName: 'GEM/Eprocure ID' },
  location: { maxLength: 255, fieldName: 'Location' },
  source: { maxLength: 100, fieldName: 'Source' },
  tender_type: { maxLength: 100, fieldName: 'Tender Type' },
  portal_link: { maxLength: 2000, fieldName: 'Portal Link' },
  tender_notes: { maxLength: 10000, fieldName: 'Tender Notes' },
  pq_criteria: { maxLength: 10000, fieldName: 'PQ Criteria' }
}

/**
 * Truncate field value if it exceeds the maximum length
 * @param fieldName - The field name to check
 * @param value - The value to truncate
 * @param originalLength - Original length before truncation (for warning)
 * @returns Object with truncated value and whether truncation occurred
 */
export function truncateField(
  fieldName: string,
  value: string,
  originalLength?: number
): { value: string; truncated: boolean; warning?: string } {
  const limit = FIELD_LIMITS[fieldName]
  
  if (!limit) {
    // No limit defined, return as-is
    return { value, truncated: false }
  }

  if (value.length <= limit.maxLength) {
    return { value, truncated: false }
  }

  const truncatedValue = value.substring(0, limit.maxLength)
  const originalLen = originalLength || value.length
  const warning = `${limit.fieldName} truncated from ${originalLen} to ${limit.maxLength} characters`

  return {
    value: truncatedValue,
    truncated: true,
    warning
  }
}

/**
 * Parse boolean value from string
 * @param value - String value to parse
 * @returns Boolean value
 */
export function parseBoolean(value: string): boolean {
  return ['yes', 'y', 'true', '1'].includes(value.toLowerCase())
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean
  error?: string
  warning?: string
  normalizedValue?: string
}

/**
 * Validate tender name
 */
export function validateTenderName(name: string): ValidationResult {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Tender Name is required' }
  }

  if (name.trim().length < 3) {
    return { valid: false, error: 'Tender Name must be at least 3 characters' }
  }

  return { valid: true, normalizedValue: name.trim() }
}

/**
 * Validate date string and convert to ISO format
 * Supports multiple formats: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, Excel serial dates
 */
export function validateDate(dateStr: string, fieldName: string): ValidationResult {
  if (!dateStr || dateStr.trim().length === 0) {
    return { valid: true, normalizedValue: '' } // Empty dates are allowed
  }

  const trimmed = dateStr.trim()

  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const date = new Date(trimmed + 'T00:00:00')
    if (!isNaN(date.getTime())) {
      return { valid: true, normalizedValue: trimmed }
    }
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch
    const date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00`)
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0]
      return { valid: true, normalizedValue: isoDate }
    }
  }

  // Try Excel serial date (number)
  const excelSerial = parseFloat(trimmed)
  if (!isNaN(excelSerial) && excelSerial > 0) {
    // Excel epoch starts from 1900-01-01, but JavaScript Date uses 1899-12-30
    // Excel serial 1 = 1900-01-01, but JS Date(0) = 1899-12-30
    // So we need to subtract 2 days
    const excelEpoch = new Date(1899, 11, 30) // December 30, 1899
    const date = new Date(excelEpoch.getTime() + (excelSerial - 1) * 24 * 60 * 60 * 1000)
    if (!isNaN(date.getTime())) {
      const isoDate = date.toISOString().split('T')[0]
      return { valid: true, normalizedValue: isoDate, warning: `Converted Excel serial date to ${isoDate}` }
    }
  }

  return {
    valid: false,
    error: `${fieldName}: Invalid date format "${trimmed}". Expected formats: YYYY-MM-DD, DD/MM/YYYY, or DD-MM-YYYY`
  }
}

/**
 * Validate and parse amount (decimal number)
 * Removes currency symbols, commas, and validates numeric value
 */
export function validateAmount(amountStr: string, fieldName: string): ValidationResult {
  if (!amountStr || amountStr.trim().length === 0) {
    return { valid: true, normalizedValue: '0' } // Empty amounts default to 0
  }

  // Remove currency symbols, commas, and whitespace
  const cleaned = amountStr
    .replace(/[₹$€£,]/g, '')
    .replace(/\s/g, '')
    .trim()

  const amount = parseFloat(cleaned)

  if (isNaN(amount)) {
    return {
      valid: false,
      error: `${fieldName}: Invalid number format "${amountStr}"`
    }
  }

  if (amount < 0) {
    return {
      valid: false,
      error: `${fieldName}: Amount cannot be negative`
    }
  }

  // Format to 2 decimal places
  const normalized = amount.toFixed(2)

  return { valid: true, normalizedValue: normalized }
}

/**
 * Allowed status values
 */
export const ALLOWED_STATUSES = [
  'new',
  'assigned',
  'under-study',
  'on-hold',
  'will-bid',
  'pre-bid',
  'wait-for-corrigendum',
  'in-preparation',
  'ready-to-submit',
  'submitted',
  'ready-to-submit',
  'under-evaluation',
  'qualified',
  'won',
  'not-qualified',
  'not-bidding'
]

/**
 * Validate status value
 */
export function validateStatus(status: string): ValidationResult {
  if (!status || status.trim().length === 0) {
    return { valid: true, normalizedValue: 'new' } // Default status
  }

  const normalized = status.trim().toLowerCase().replace(/\s+/g, '-')
  
  if (!ALLOWED_STATUSES.includes(normalized)) {
    return {
      valid: false,
      error: `Invalid status "${status}". Allowed values: ${ALLOWED_STATUSES.join(', ')}`
    }
  }

  return { valid: true, normalizedValue: normalized }
}

/**
 * Allowed source values
 */
export const ALLOWED_SOURCES = ['tender247', 'gem', 'nprocure', 'eprocure', 'other']

/**
 * Validate source value
 */
export function validateSource(source: string): ValidationResult {
  if (!source || source.trim().length === 0) {
    return { valid: true, normalizedValue: null } // Empty source is allowed
  }

  const normalized = source.trim().toLowerCase()
  
  if (!ALLOWED_SOURCES.includes(normalized)) {
    return {
      valid: false,
      error: `Invalid source "${source}". Allowed values: ${ALLOWED_SOURCES.join(', ')}`
    }
  }

  return { valid: true, normalizedValue: normalized }
}

/**
 * Validation error with context
 */
export interface ValidationError {
  row: number
  field: string
  value: any
  message: string
  severity: 'error' | 'warning'
}

/**
 * Format validation error message
 */
export function formatValidationError(error: ValidationError): string {
  return `Row ${error.row}, Column '${error.field}': ${error.message}`
}

