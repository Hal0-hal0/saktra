"use client"

import * as React from "react"
import { toast } from "sonner"
import { supabase } from "@/lib/supabase/supabase-client"
import { PasswordInput } from "@/components/ui/password-input"
import { Spinner } from "@/components/ui/spinner"
import { DeleteRoundedIcon } from "@/components/icons/material-symbols-delete-rounded"
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
import { Label } from "@/components/ui/label"

type DeleteConfirmDialogProps = {
  /** Trigger element (rendered inside AlertDialogTrigger asChild). */
  children: React.ReactNode
  /** Dialog title — usually quotes the entity being deleted. */
  title: React.ReactNode
  /** Optional extra description below the title. */
  description?: React.ReactNode
  /** Called only after the admin's password is verified. Throw to surface an error. */
  onConfirm: () => Promise<void> | void
  /** Label for the confirm button (default: "Delete"). */
  confirmLabel?: string
  /** Controlled open state — optional. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function DeleteConfirmDialog({
  children,
  title,
  description,
  onConfirm,
  confirmLabel = "Delete",
  open: openProp,
  onOpenChange,
}: DeleteConfirmDialogProps) {
  const [internalOpen, setInternalOpen] = React.useState(false)
  const open = openProp ?? internalOpen
  const setOpen = (next: boolean) => {
    if (onOpenChange) onOpenChange(next)
    else setInternalOpen(next)
    if (!next) {
      setPassword("")
      setError(null)
    }
  }

  const [password, setPassword] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (!password) {
      setError("Enter your password to confirm.")
      return
    }
    setError(null)
    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email
      if (!email) throw new Error("Your session expired. Please log in again.")

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (verifyError) {
        setError("Incorrect password.")
        setLoading(false)
        return
      }

      await onConfirm()
      setOpen(false)
    } catch (err: any) {
      const message = err?.message ?? "Something went wrong."
      setError(message)
      toast.error(message, { position: "top-center" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <DeleteRoundedIcon />
          </AlertDialogMedia>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <div className="grid gap-2 px-1 pb-2">
          <Label htmlFor="confirm-password">Confirm with your password</Label>
          <PasswordInput
            id="confirm-password"
            placeholder="Your account password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel variant="outline" disabled={loading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
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
