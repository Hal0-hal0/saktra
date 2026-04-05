'use client';
import React from 'react'
import { supabase } from "@/lib/supabase/supabase-client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

const Users = () => {
  const router = useRouter(); 

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }
  return (
    <div>
        <h1>users</h1>
        <Button onClick={logout}>Logout</Button>
    </div>
  )
}

export default Users