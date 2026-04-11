'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/supabase-client'

const Inactive = () => {
    const router = useRouter()

    const loginPage = async() => {
        await supabase.auth.signOut()
        router.push('/login')
    }

  return (
    <div>
        Inactive
        <Button onClick={loginPage}>Continue to login!</Button>
    </div>
    

  )
}

export default Inactive