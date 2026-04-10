import { Trash2Icon } from "lucide-react"
import { LoadComponentsReturnType } from "next/dist/server/load-components"

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
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/supabase-client"
import { useRouter } from "next/navigation"
import React, { useState } from "react"
import { LogoutRoundedIcon } from "@/components/icons/material-symbols-logout-rounded"

export function LogOutConfirmation({children}:{children: React.ReactNode}) {
  const [open, setOpen] = useState(false)

  const router = useRouter();

  const logOut = async () => {
    await supabase.auth.signOut();
    router.push('/login')
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild onClick={() => setOpen(true)}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <LogoutRoundedIcon/>
          </AlertDialogMedia>
          <AlertDialogTitle>Logout?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be redirected back to the login page!
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={logOut}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
