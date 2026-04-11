'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/supabase-client'
import { ShieldOff } from 'lucide-react'

const Inactive = () => {
    const router = useRouter()

    const loginPage = async() => {
        await supabase.auth.signOut()
        router.push('/login')
    }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-100 via-gray-50 to-zinc-100 px-4">
      <div className="w-full max-w-sm bg-white/90 backdrop-blur-sm border border-stone-200 rounded-2xl shadow-xl shadow-stone-200/60 px-8 py-10 flex flex-col items-center text-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
 
        {/* Icon */}
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-stone-100 border border-stone-200">
          <ShieldOff
            className="w-6 h-6 text-stone-400"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        </div>
 
        {/* Text */}
        <div className="flex flex-col gap-2">
          <h1 className="text-xl font-semibold tracking-tight text-stone-800">
            Account Inactive
          </h1>
          <p className="text-sm text-stone-500 leading-relaxed">
            Your account is currently inactive. Please contact admin for support or log in again to continue.
          </p>
        </div>
 
        {/* CTA */}
        <Button
          onClick={loginPage}
          className="w-full bg-stone-800 hover:bg-stone-700 active:bg-stone-900 text-white text-sm font-medium rounded-xl transition-all duration-200 ease-in-out shadow-sm hover:shadow-md py-5"
          aria-label="Continue to login page"
        >
          Continue to Login
        </Button>
 
      </div>
    </main>
  )

}

export default Inactive