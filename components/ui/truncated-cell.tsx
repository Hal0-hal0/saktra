'use client'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface TruncatedCellProps {
  content: string | null | undefined
  maxLength?: number
  className?: string
}

/**
 * Table cell component that truncates text exceeding maxLength characters
 * Shows full text in tooltip on hover
 * Default maxLength is 30 characters with "..." suffix
 */
export function TruncatedCell({
  content,
  maxLength = 30,
  className = '',
}: TruncatedCellProps) {
  if (!content) {
    return <span className={className}>-</span>
  }

  const text = String(content).trim()
  
  if (text.length <= maxLength) {
    return <span className={className}>{text}</span>
  }

  const truncated = text.substring(0, maxLength - 3) + '...'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`cursor-help ${className}`}>{truncated}</span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs break-words">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
