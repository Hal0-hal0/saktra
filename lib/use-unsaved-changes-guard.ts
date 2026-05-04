"use client"

import { useCallback, useState } from "react"

type UseUnsavedChangesGuardOptions = {
  isDirty: boolean
  onDiscard: () => void
}

export function useUnsavedChangesGuard({
  isDirty,
  onDiscard,
}: UseUnsavedChangesGuardOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleOpenChange = useCallback(
    (nextOpen: boolean, setOpen: (open: boolean) => void) => {
      if (nextOpen) {
        setOpen(true)
        return
      }

      if (isDirty) {
        setConfirmOpen(true)
        return
      }

      setOpen(false)
    },
    [isDirty]
  )

  const requestClose = useCallback(() => {
    if (isDirty) {
      setConfirmOpen(true)
      return
    }

    onDiscard()
  }, [isDirty, onDiscard])

  const confirmDiscard = useCallback(() => {
    setConfirmOpen(false)
    onDiscard()
  }, [onDiscard])

  const cancelDiscard = useCallback(() => {
    setConfirmOpen(false)
  }, [])

  return {
    cancelDiscard,
    confirmDiscard,
    confirmOpen,
    handleOpenChange,
    requestClose,
    setConfirmOpen,
  }
}
