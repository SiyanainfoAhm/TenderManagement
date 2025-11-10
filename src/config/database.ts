// Database table and function prefix configuration
export const DB_PREFIX = 'tender1_'

// Table names with prefix
export const TABLES = {
  companies: `${DB_PREFIX}companies`,
  users: `${DB_PREFIX}users`,
  user_companies: `${DB_PREFIX}user_companies`,
  tenders: `${DB_PREFIX}tenders`,
  tender_history: `${DB_PREFIX}tender_history`,
  company_invitations: `${DB_PREFIX}company_invitations`,
  tender_attachments: `${DB_PREFIX}tender_attachments`,
  bid_fees: `${DB_PREFIX}bid_fees`,
  bid_fee_attachments: `${DB_PREFIX}bid_fee_attachments`,
}

// Function names with prefix
export const FUNCTIONS = {
  authenticate_user: `${DB_PREFIX}authenticate_user`,
  create_user: `${DB_PREFIX}create_user`,
  add_user_to_company: `${DB_PREFIX}add_user_to_company`,
  remove_user_from_company: `${DB_PREFIX}remove_user_from_company`,
  set_default_company: `${DB_PREFIX}set_default_company`,
  get_user_companies: `${DB_PREFIX}get_user_companies`,
  check_user_company_access: `${DB_PREFIX}check_user_company_access`,
  get_company_stats: `${DB_PREFIX}get_company_stats`,
  hash_password: `${DB_PREFIX}hash_password`,
  verify_password: `${DB_PREFIX}verify_password`,
  update_user_password: `${DB_PREFIX}update_user_password`,
}

// Helper function to get table name
export const getTableName = (table: keyof typeof TABLES) => TABLES[table]

// Helper function to get function name
export const getFunctionName = (func: keyof typeof FUNCTIONS) => FUNCTIONS[func]

