import { useState, useRef, KeyboardEvent } from 'react'

interface BulletTextAreaProps {
  label?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
  className?: string
}

export default function BulletTextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required = false,
  className = ''
}: BulletTextAreaProps) {
  const [isInBulletMode, setIsInBulletMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      
      const textarea = textareaRef.current
      if (!textarea) return

      const cursorPosition = textarea.selectionStart
      const textBeforeCursor = value.substring(0, cursorPosition)
      const textAfterCursor = value.substring(cursorPosition)
      
      // Get the current line and check if it's empty
      const lines = textBeforeCursor.split('\n')
      const currentLine = lines[lines.length - 1]
      const isCurrentLineEmpty = currentLine.trim() === ''
      
      // Check if we have bullets in the text
      const hasBullets = value.includes('•') || value.includes('-')
      
      if (hasBullets || isInBulletMode) {
        // Check if this is double Enter - empty line after bullet content
        if (isCurrentLineEmpty) {
          // Look at the previous line to see if it had a bullet
          const previousLine = lines[lines.length - 2] || ''
          const hasPreviousBullet = previousLine.includes('•') || previousLine.includes('-')
          
          console.log('Double Enter check:', {
            currentLine: `"${currentLine}"`,
            isCurrentLineEmpty,
            previousLine: `"${previousLine}"`,
            hasPreviousBullet,
            lines: lines.length
          })
          
          if (hasPreviousBullet) {
            // This is double Enter - end bullet mode
            console.log('Ending bullet mode - double Enter detected')
            setIsInBulletMode(false)
            const newValue = textBeforeCursor + '\n' + textAfterCursor
            onChange(newValue)
            
            // Set cursor position after the newline
            setTimeout(() => {
              textarea.selectionStart = textarea.selectionEnd = cursorPosition + 1
            }, 0)
            return
          }
        }
        
        // Add new bullet point
        const indent = currentLine.match(/^(\s*)/)?.[1] || ''
        const newValue = textBeforeCursor + '\n' + indent + '• ' + textAfterCursor
        onChange(newValue)
        setIsInBulletMode(true)
        
        // Set cursor position after the bullet
        setTimeout(() => {
          const newCursorPos = cursorPosition + 1 + indent.length + 2 // +1 for newline, +2 for "• "
          textarea.selectionStart = textarea.selectionEnd = newCursorPos
        }, 0)
      } else {
        // Start bullet mode
        const newValue = textBeforeCursor + '\n• ' + textAfterCursor
        onChange(newValue)
        setIsInBulletMode(true)
        
        // Set cursor position after the bullet
        setTimeout(() => {
          const newCursorPos = cursorPosition + 1 + 2 // +1 for newline, +2 for "• "
          textarea.selectionStart = textarea.selectionEnd = newCursorPos
        }, 0)
      }
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    
    // Update bullet mode state based on content
    const hasBullets = newValue.includes('•') || newValue.includes('-')
    setIsInBulletMode(hasBullets)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          required={required}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        
        {/* Instructions */}
        <div className="mt-1 text-xs text-gray-500 text-right">
          Press Enter for new bullet • Double Enter to end list
        </div>
      </div>
    </div>
  )
}
