'use client'
import React from "react";
import {useState, useEffect} from "react"
import { supabase } from "@/lib/supabase/supabase-client";
import { SkeletonText } from "@/components/skeleton/skeleton-text";

const Profile = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setloading] = useState(true)
  
    const getUser = async () => {
      const {data: user} = await supabase.auth.getClaims();
  
      const {data:details} = await supabase 
      .from('profiles')
      .select('*')
      .eq('user_id', user?.claims?.sub)
      .single();
      setUser(details);
      setloading(false)
    }

    useEffect (() => {
      getUser()
    },[])
    
    return (
      <div>
      {!loading ? (
        <>
          <h1 className='font-bold text-4xl'>Profile</h1>
          <h3>Username: {user?.user_name}</h3>
          <h3>Role: {user?.role}</h3>
          <h3>Email: {user?.email}</h3>
        </>
        
      ) : (
        <SkeletonText/>
      )}
        

      </div>
    )
}

export default Profile