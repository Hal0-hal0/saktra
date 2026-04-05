'use client'
import React, { use, useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ModeToggle } from '@/components/mode-toggle';

const Admin = () => {
    const router = useRouter();
    const [profile, setProfile] = React.useState<any>(null);
  
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

    const fetchProfile = async () => {  //just to see it in the console
        const {data: user} = await supabase.auth.getClaims();
        console.log('User claims:', user); // log the user claims to see what we get
    }

    

    useEffect(() => {
      getUserDetails();
      fetchProfile();
    }, [])

  return (
    <div>
      <ModeToggle />
      <Button onClick={logout}>Logout</Button>
      <Button onClick={getUserDetails}>Get User Details</Button>
      <h3>{profile?.role}</h3>
      <h3>{profile?.id}</h3>
      <h3>{profile?.user_id}</h3>
      <h3>{profile?.created_at}</h3>



    </div>
  )
}

export default Admin