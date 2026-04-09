'use client';
import React, { useState } from 'react'
import { supabase } from "@/lib/supabase/supabase-client";
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import { get } from 'http';
import { ModeToggle } from '@/components/mode-toggle';

const Users = () => {
  const router = useRouter(); 
  const [profile, setProfile] = useState<any>(null);
  const [claims, setClaims] = useState<any>(null);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }

  const getUserDetails = async () => {
    const {data: user} = await supabase.auth.getClaims();
    const { data: profile } = await supabase
      .from('profiles') //getClaims is used to get the user's claims, which includes their role and other details
      .select('*')
      .eq('user_id', user?.claims?.sub) // filter by current user's id
      .single() // we expect only one profile per user
    
      setProfile(profile);
  }

  

  useEffect(() => {
    getUserDetails();
  }, []);



  return (
    <div>
        <h1>Home Page</h1>
    </div>
  )
}

export default Users