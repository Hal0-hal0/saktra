'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ShieldOff } from 'lucide-react'
import { ModeToggle } from '@/components/mode-toggle'
import { supabase } from '@/lib/supabase/supabase-client'

const Inactive = () => {
  const router = useRouter()

  const loginPage = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background px-4">

      {/* Mode Toggle — top right */}
      <div className="absolute top-4 right-4">
        <ModeToggle />
      </div>

      <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <Card className="rounded-2xl border border-border shadow-lg">
          <CardHeader className="flex flex-col items-center text-center gap-4 pb-2">

            {/* Icon */}
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-muted border border-border">
              <ShieldOff
                className="w-6 h-6 text-muted-foreground"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col gap-1">
              <CardTitle className="text-xl font-semibold tracking-tight text-foreground">
                Account Inactive
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground leading-relaxed">
                Your account is currently inactive. Please contact admin for support or log in again to continue.
              </CardDescription>
            </div>

          </CardHeader>

          <CardContent className="pt-4">
            <Button
              onClick={loginPage}
              className="w-full rounded-xl py-5 text-sm font-medium transition-all duration-200 ease-in-out shadow-sm hover:shadow-md"
              aria-label="Continue to login page"
            >
              Continue to Login
            </Button>
          </CardContent>
        </Card>
      </div>

    </main>
  )
}

export default Inactive