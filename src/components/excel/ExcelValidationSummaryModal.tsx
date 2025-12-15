import React, { useState } from 'react'
import Modal from '@/components/base/Modal'
import Button from '@/components/base/Button'
import { ValidationSummary } from '@/types'

interface ExcelValidationSummaryModalProps {
  isOpen: boolean
  onClose: () => void
  summary: ValidationSummary
  onConfirm: () => void
  onCancel: () => void
}

export default function ExcelValidationSummaryModal({
  isOpen,
  onClose,
  summary,
  onConfirm,
  onCancel
}: ExcelValidationSummaryModalProps) {
  const [expandedSections, setExpandedSections] = useState({
    validationErrors: false,
    duplicates: false
  })

  const toggleSection = (section: 'validationErrors' | 'duplicates') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Validation Summary" size="lg">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Valid Rows */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Valid Data</p>
                <p className="text-2xl font-bold text-green-700">{summary.validCount}</p>
                <p className="text-xs text-green-600 mt-1">rows ready to upload</p>
              </div>
              <i className="ri-checkbox-circle-line text-4xl text-green-500"></i>
            </div>
          </div>

          {/* Validation Errors */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600 font-medium">Validation Errors</p>
                <p className="text-2xl font-bold text-red-700">{summary.errorCount}</p>
                <p className="text-xs text-red-600 mt-1">rows with errors</p>
              </div>
              <i className="ri-error-warning-line text-4xl text-red-500"></i>
            </div>
          </div>

          {/* Duplicates */}
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Duplicates</p>
                <p className="text-2xl font-bold text-orange-700">{summary.duplicateCount}</p>
                <p className="text-xs text-orange-600 mt-1">rows with duplicate IDs</p>
              </div>
              <i className="ri-file-copy-line text-4xl text-orange-500"></i>
            </div>
          </div>
        </div>

        {/* Total Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Total Rows:</span> {summary.totalRows} | 
            <span className="font-semibold text-green-600"> Valid:</span> {summary.validCount} | 
            <span className="font-semibold text-red-600"> Errors:</span> {summary.errorCount} | 
            <span className="font-semibold text-orange-600"> Duplicates:</span> {summary.duplicateCount}
          </p>
        </div>

        {/* Validation Errors Section */}
        {summary.errorCount > 0 && (
          <div className="border border-red-200 rounded-lg">
            <button
              onClick={() => toggleSection('validationErrors')}
              className="w-full flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 transition-colors rounded-t-lg"
            >
              <div className="flex items-center">
                <i className="ri-error-warning-line text-red-600 text-xl mr-2"></i>
                <span className="font-semibold text-red-700">
                  Validation Errors ({summary.errorCount} rows)
                </span>
              </div>
              <i className={`ri-arrow-${expandedSections.validationErrors ? 'up' : 'down'}-s-line text-red-600 text-xl`}></i>
            </button>
            {expandedSections.validationErrors && (
              <div className="p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {summary.invalidRows.map((row, index) => (
                    <div key={index} className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-2">
                      <span className="font-semibold text-red-600">Row {row.rowNumber}:</span>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        {row.errors.map((error, errIndex) => (
                          <li key={errIndex} className="text-red-600">{error}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Duplicates Section */}
        {summary.duplicateCount > 0 && (
          <div className="border border-orange-200 rounded-lg">
            <button
              onClick={() => toggleSection('duplicates')}
              className="w-full flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 transition-colors rounded-t-lg"
            >
              <div className="flex items-center">
                <i className="ri-file-copy-line text-orange-600 text-xl mr-2"></i>
                <span className="font-semibold text-orange-700">
                  Duplicate IDs ({summary.duplicateCount} rows)
                </span>
              </div>
              <i className={`ri-arrow-${expandedSections.duplicates ? 'up' : 'down'}-s-line text-orange-600 text-xl`}></i>
            </button>
            {expandedSections.duplicates && (
              <div className="p-4 max-h-60 overflow-y-auto">
                <div className="space-y-2">
                  {summary.duplicateRows.map((row, index) => (
                    <div key={index} className="text-sm text-gray-700 bg-white border border-gray-200 rounded p-2">
                      <span className="font-semibold text-orange-600">Row {row.rowNumber}:</span>
                      <span className="ml-2 text-orange-600">{row.duplicateReason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Warnings */}
        {summary.warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <i className="ri-alert-line text-yellow-600 text-xl mr-2 flex-shrink-0"></i>
              <div>
                <p className="text-sm font-semibold text-yellow-800">
                  Warnings ({summary.warnings.length})
                </p>
                <p className="text-xs text-yellow-700 mt-1">
                  These are non-blocking warnings. Data will be uploaded with warnings.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            {summary.validCount > 0 ? (
              <span>
                <span className="font-semibold">{summary.validCount}</span> valid row(s) will be uploaded.
              </span>
            ) : (
              <span className="text-red-600 font-semibold">No valid rows to upload.</span>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel} disabled={summary.validCount === 0}>
              Cancel
            </Button>
            <Button
              onClick={onConfirm}
              disabled={summary.validCount === 0}
              className={summary.validCount === 0 ? '' : '!bg-green-600 hover:!bg-green-700 !text-white'}
            >
              <i className="ri-upload-cloud-line mr-2"></i>
              Upload Remaining Valid Data ({summary.validCount})
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

