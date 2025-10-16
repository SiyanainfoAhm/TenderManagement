/**
 * Database Export Script
 * Exports all tender management tables, functions, and data from Supabase
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ecvqhfbiwqmqgiqfxheu.supabase.co'
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdnFoZmJpd3FtcWdpcWZ4aGV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUzMDEwMTksImV4cCI6MjA2MDg3NzAxOX0.rRF6VbPIRMucv2ePb4QFKA6gvmevrhqO0M_nTiWm5n4'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Table names to export
const TABLES = [
  'tender_companies',
  'tender_users',
  'tender_tenders',
  'tender_tender_history'
]

/**
 * Fetch all data from a table
 */
async function fetchTableData(tableName) {
  console.log(`\n📊 Fetching data from ${tableName}...`)
  
  try {
    const { data, error, count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: true })

    if (error) {
      console.error(`❌ Error fetching ${tableName}:`, error.message)
      return { tableName, data: [], count: 0, error: error.message }
    }

    console.log(`✅ Fetched ${count} rows from ${tableName}`)
    return { tableName, data: data || [], count: count || 0, error: null }
  } catch (err) {
    console.error(`❌ Exception fetching ${tableName}:`, err.message)
    return { tableName, data: [], count: 0, error: err.message }
  }
}

/**
 * Generate SQL INSERT statements for table data
 */
function generateInsertSQL(tableName, rows) {
  if (!rows || rows.length === 0) {
    return `-- No data in ${tableName}\n`
  }

  let sql = `\n-- ============================================\n`
  sql += `-- DATA: ${tableName} (${rows.length} rows)\n`
  sql += `-- ============================================\n\n`

  const columns = Object.keys(rows[0])
  
  rows.forEach((row, index) => {
    const values = columns.map(col => {
      const value = row[col]
      
      if (value === null || value === undefined) {
        return 'NULL'
      } else if (typeof value === 'string') {
        // Escape single quotes
        const escaped = value.replace(/'/g, "''")
        return `'${escaped}'`
      } else if (typeof value === 'boolean') {
        return value ? 'true' : 'false'
      } else if (typeof value === 'object') {
        // Handle JSON objects
        const escaped = JSON.stringify(value).replace(/'/g, "''")
        return `'${escaped}'::jsonb`
      } else if (value instanceof Date) {
        return `'${value.toISOString()}'`
      } else {
        return value
      }
    })

    sql += `INSERT INTO ${tableName} (${columns.join(', ')})\n`
    sql += `VALUES (${values.join(', ')})\n`
    sql += `ON CONFLICT DO NOTHING;\n\n`
  })

  return sql
}

/**
 * Generate a complete database export
 */
async function exportDatabase() {
  console.log('🚀 Starting database export...')
  console.log('=' .repeat(60))

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const exportDir = 'database-exports'
  
  // Create export directory if it doesn't exist
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true })
  }

  // Fetch all table data
  const allTableData = []
  for (const tableName of TABLES) {
    const result = await fetchTableData(tableName)
    allTableData.push(result)
  }

  console.log('\n' + '='.repeat(60))
  console.log('📝 Generating export files...\n')

  // Generate summary
  let summary = `-- ============================================\n`
  summary += `-- TENDER MANAGEMENT DATABASE EXPORT\n`
  summary += `-- Generated: ${new Date().toISOString()}\n`
  summary += `-- Supabase URL: ${SUPABASE_URL}\n`
  summary += `-- ============================================\n\n`
  summary += `-- Export Summary:\n`
  
  allTableData.forEach(({ tableName, count, error }) => {
    if (error) {
      summary += `-- ${tableName}: ERROR - ${error}\n`
    } else {
      summary += `-- ${tableName}: ${count} rows\n`
    }
  })
  summary += `\n-- ============================================\n\n`

  // Generate complete SQL dump
  let fullSQL = summary
  
  // Add schema from existing file
  console.log('📄 Reading database schema...')
  if (fs.existsSync('database-schema-clean.sql')) {
    const schema = fs.readFileSync('database-schema-clean.sql', 'utf-8')
    fullSQL += `-- ============================================\n`
    fullSQL += `-- DATABASE SCHEMA\n`
    fullSQL += `-- ============================================\n\n`
    fullSQL += schema + '\n\n'
  }

  // Add data
  console.log('📄 Generating INSERT statements...')
  fullSQL += `-- ============================================\n`
  fullSQL += `-- DATABASE DATA\n`
  fullSQL += `-- ============================================\n`
  
  allTableData.forEach(({ tableName, data, error }) => {
    if (!error && data && data.length > 0) {
      fullSQL += generateInsertSQL(tableName, data)
    }
  })

  // Write complete SQL dump
  const fullSQLPath = path.join(exportDir, `tender-management-full-export-${timestamp}.sql`)
  fs.writeFileSync(fullSQLPath, fullSQL, 'utf-8')
  console.log(`✅ Full SQL export: ${fullSQLPath}`)

  // Write JSON data for each table
  allTableData.forEach(({ tableName, data, count, error }) => {
    if (!error && data && data.length > 0) {
      const jsonPath = path.join(exportDir, `${tableName}-${timestamp}.json`)
      fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`✅ JSON export: ${jsonPath} (${count} rows)`)
    }
  })

  // Write summary report
  const reportPath = path.join(exportDir, `export-report-${timestamp}.txt`)
  let report = `TENDER MANAGEMENT DATABASE EXPORT REPORT\n`
  report += `${'='.repeat(60)}\n\n`
  report += `Export Date: ${new Date().toLocaleString()}\n`
  report += `Supabase URL: ${SUPABASE_URL}\n\n`
  report += `Tables Exported:\n`
  report += `${'-'.repeat(60)}\n`
  
  let totalRows = 0
  allTableData.forEach(({ tableName, count, error }) => {
    if (error) {
      report += `${tableName.padEnd(30)} ERROR: ${error}\n`
    } else {
      report += `${tableName.padEnd(30)} ${count} rows\n`
      totalRows += count
    }
  })
  
  report += `${'-'.repeat(60)}\n`
  report += `Total Rows: ${totalRows}\n\n`
  
  report += `Files Generated:\n`
  report += `${'-'.repeat(60)}\n`
  report += `1. ${path.basename(fullSQLPath)}\n`
  report += `   - Complete SQL dump with schema and data\n\n`
  
  allTableData.forEach(({ tableName, count, error }, index) => {
    if (!error && count > 0) {
      report += `${index + 2}. ${tableName}-${timestamp}.json\n`
      report += `   - JSON export (${count} rows)\n\n`
    }
  })
  
  fs.writeFileSync(reportPath, report, 'utf-8')
  console.log(`✅ Export report: ${reportPath}`)

  console.log('\n' + '='.repeat(60))
  console.log('🎉 Database export completed successfully!')
  console.log('=' .repeat(60))
  console.log(`\n📁 All files saved in: ${exportDir}/\n`)
  
  // Print summary
  console.log('Summary:')
  allTableData.forEach(({ tableName, count, error }) => {
    if (error) {
      console.log(`  ❌ ${tableName}: ERROR - ${error}`)
    } else {
      console.log(`  ✅ ${tableName}: ${count} rows`)
    }
  })
  console.log(`\n  📊 Total Rows: ${totalRows}`)
}

// Run the export
exportDatabase().catch(err => {
  console.error('💥 Fatal error:', err)
  process.exit(1)
})

