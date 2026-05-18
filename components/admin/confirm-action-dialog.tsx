"use client"

import * as React from "react"
import { toast } from "sonner"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type ConfirmActionDialogProps = {
  children: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Confirm button label (default: "Confirm"). */
  confirmLabel?: string
  /** Icon shown in the dialog media slot. */
  icon?: React.ReactNode
  /** Variant for the confirm button. */
  variant?: "default" | "destructive"
  /** Called when the user confirms. Throw to surface an error. */
  onConfirm: () => Promise<void> | void
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ConfirmActionDialog({
  children,
  title,
  description,
  confirmLabel = "Confirm",
  icon,
  variant = "default",
  onConfirm,
  open: openProp,
  onOpenChange,
}: ConfirmActionDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
  }

  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await onConfirm()
      setOpen(false)
    } catch (err: any) {
      toast.error(err?.message ?? "Something went wrong.", { position: "top-center" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          {icon ? (
            <AlertDialogMedia
              className={
                variant === "destructive"
                  ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                  : "bg-primary/10 text-primary"
              }
            >
              {icon}
            </AlertDialogMedia>
          ) : null}
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading && <Spinner />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
