'use client'

import * as React from 'react'
import { Check, ChevronDownIcon, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SearchableOption = {
  value: string
  label: string
  description?: string
  searchTokens?: string[]
}

type Props = {
  value: string
  onValueChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  allowClear?: boolean
  disabled?: boolean
  ariaInvalid?: boolean
  className?: string
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = 'Select an option...',
  emptyText = 'No options found.',
  searchPlaceholder = 'Search...',
  allowClear = false,
  disabled,
  ariaInvalid,
  className,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const selected = React.useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => {
      const haystack = [o.label, o.description, ...(o.searchTokens ?? [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [options, query])

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-invalid={ariaInvalid || undefined}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !selected && 'text-muted-foreground',
            ariaInvalid && 'border-destructive aria-invalid:ring-destructive/20',
            className
          )}
        >
          <span className="truncate">
            {selected ? selected.label : placeholder}
          </span>
          <div className="flex items-center gap-1">
            {allowClear && selected ? (
              <span
                role="button"
                aria-label="Clear selection"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onValueChange('')
                }}
                className="rounded p-0.5 hover:bg-muted"
              >
                <X className="size-3.5 text-muted-foreground" />
              </span>
            ) : null}
            <ChevronDownIcon className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-[16rem] p-0"
        align="start"
      >
        <div className="flex flex-col">
          <div className="relative border-b">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="border-0 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => {
                      onValueChange(opt.value)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0 mt-0.5',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block truncate font-medium">{opt.label}</span>
                      {opt.description ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {opt.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
