'use client'

import * as React from 'react'
import { toast } from 'sonner'
import { KeyRound, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase/supabase-client'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { PasswordInput } from '@/components/ui/password-input'
import { Spinner } from '@/components/ui/spinner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type Props = {
  /** Optional custom trigger (button, link, etc.). Defaults to a violet "Change Password" button. */
  children?: React.ReactNode
}

export function UpdatePasswordDialog({ children }: Props) {
  const [open, setOpen] = React.useState(false)
  const [oldPassword, setOldPassword] = React.useState('')
  const [newPassword, setNewPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)

  const reset = () => {
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError(null)
    setLoading(false)
  }

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!oldPassword) {
      setError('Enter your current password to confirm.')
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }
    if (newPassword === oldPassword) {
      setError('New password must be different from your current password.')
      return
    }

    setLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user?.email
      if (!email) {
        setError('Your session expired. Please log in again.')
        return
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      })
      if (verifyError) {
        setError('Current password is incorrect.')
        return
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (updateError) {
        setError(updateError.message)
        return
      }

      toast.success('Password updated.', { position: 'top-center' })
      setOpen(false)
      reset()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children ?? (
          <button
            type="button"
            className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 border border-violet-300 rounded-lg px-3 py-1.5 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
          >
            <KeyRound size={13} />
            Change Password
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-violet-600" />
            Update Password
          </DialogTitle>
          <DialogDescription>
            Enter your current password, then choose a new one. You&apos;ll stay signed in.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="old-password">Current password</Label>
            <PasswordInput
              id="old-password"
              autoComplete="current-password"
              placeholder="Your current password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-password">New password</Label>
            <PasswordInput
              id="new-password"
              autoComplete="new-password"
              placeholder="Min. 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm-new-password">Confirm new password</Label>
            <PasswordInput
              id="confirm-new-password"
              autoComplete="new-password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-xs font-medium text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner data-icon="inline-start" />}
              Update Password
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
