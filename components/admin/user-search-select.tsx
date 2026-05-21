'use client'

import * as React from 'react'
import { Check, ChevronDownIcon, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

export type SelectableProfile = {
  user_id: string
  user_name?: string | null
  email?: string | null
  first_name?: string | null
  last_name?: string | null
}

type Props = {
  value: string
  onValueChange: (id: string) => void
  profiles: SelectableProfile[]
  placeholder?: string
  emptyText?: string
  disabled?: boolean
  ariaInvalid?: boolean
  className?: string
  allowClear?: boolean
}

function displayName(p: SelectableProfile) {
  const full = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
  return full || p.user_name?.trim() || p.email?.trim() || 'Unnamed'
}

export function UserSearchSelect({
  value,
  onValueChange,
  profiles,
  placeholder = 'Select a member...',
  emptyText = 'No members found.',
  disabled,
  ariaInvalid,
  className,
  allowClear = false,
}: Props) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const selected = React.useMemo(
    () => profiles.find((p) => p.user_id === value),
    [profiles, value]
  )

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) => {
      const name = displayName(p).toLowerCase()
      const email = (p.email ?? '').toLowerCase()
      const uname = (p.user_name ?? '').toLowerCase()
      return name.includes(q) || email.includes(q) || uname.includes(q)
    })
  }, [profiles, query])

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
            {selected ? displayName(selected) : placeholder}
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
              placeholder="Search by name, username, or email..."
              className="border-0 pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none"
            />
          </div>
          <div className="max-h-64 overflow-y-auto p-1">
            {filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              filtered.map((p) => {
                const isSelected = p.user_id === value
                return (
                  <button
                    type="button"
                    key={p.user_id}
                    onClick={() => {
                      onValueChange(p.user_id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <Check
                      className={cn(
                        'size-4 shrink-0',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex-1 truncate">
                      <span className="font-medium">{displayName(p)}</span>
                      {p.email ? (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {p.email}
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
