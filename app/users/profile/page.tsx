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
          <h1 className='font-bold text-4xl mb-4'>Profile</h1>
          <div className="space-y-2">
            <h3><span className="font-semibold">Username:</span> {user?.user_name}</h3>
            <h3><span className="font-semibold">Role:</span> <span className="capitalize">{user?.role}</span></h3>
            <h3><span className="font-semibold">Email:</span> {user?.email}</h3>
            <h3>
              <span className="font-semibold">Account Status:</span>{' '}
              <span className="capitalize">{user?.status}</span>
            </h3>
            <h3>
              <span className="font-semibold">Membership Status:</span>{' '}
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user?.membership_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {user?.membership_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </h3>
            {user?.membership_status === 'paid' && user?.membership_expires_at && (
              <h3>
                <span className="font-semibold">Membership Expires:</span>{' '}
                {new Date(user.membership_expires_at).toLocaleDateString()}
              </h3>
            )}
          </div>
        </>
        
      ) : (
        <SkeletonText/>
      )}
        

      </div>
    )
}

export default Profile