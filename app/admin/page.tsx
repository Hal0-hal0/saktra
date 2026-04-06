'use client'
import React, { use, useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client';
import { useRouter } from 'next/navigation';
import { SkeletonText } from '@/components/skeleton/skeleton-text';


const Admin = () => {
    const router = useRouter();
    const [profile, setProfile] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
  
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
      setLoading(false);
    }

    const fetchProfile = async () => {  //just to see it in the console
        const {data: user} = await supabase.auth.getClaims();
        console.log('User claims:', user); // log the user claims to see what we get
    }

    useEffect(() => {
      getUserDetails();
      fetchProfile();
    }, [])

    if (loading) {
      return <SkeletonText />
    }

  return (
    <div className='mx-5 my-3'>
      <h1>Admin Page</h1>
      <h3>{profile?.role}</h3>
      <h3>{profile?.id}</h3>
      <h3>{profile?.user_id}</h3>
      <h3>{profile?.created_at}</h3>

      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p><p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>
      <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Nihil cum quaerat dignissimos quos fugit, nostrum voluptatum ratione officiis voluptates corrupti. Tempore placeat numquam incidunt quae sunt veritatis, cupiditate alias atque.</p>



    </div>
  )
}

export default Admin