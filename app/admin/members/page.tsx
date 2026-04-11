'use client'
import { useState } from 'react'
import { columns, Payment } from "./columns"
import { DataTable } from "./data-table"
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import { SkeletonText } from '@/components/skeleton/skeleton-text'
import { channel } from 'diagnostics_channel'
import { Card, CardTitle } from '@/components/ui/card'


export default function CreateUserPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setloading] = useState(true)

  const getUser = async () => {
    const {data, error} = await supabase 
    .from('profiles')
    .select('role,email,status,user_name')
    setUser(data ?? []);

    console.log('data:', data)
    console.log('error:', error)
    setloading(false)
  }

  //realtime fetch
  useEffect (() => {
    getUser()

    const channel = supabase
    .channel('profile')
    .on('postgres_changes',
      {event:'*', schema:'public', table:'profiles'},
      () => {
        getUser() //refetch when chnages
      }
    )
    .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if(loading) {
    return <SkeletonText/>
  }

  return (
    <div>
      <div>
        <h1 className='font-bold text-xl'>Manage Members</h1>
        <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Animi ea ratione deserunt consectetur accusantium hic, magnam consequatur, ab quasi repellat exercitationem, fugit amet magni eos voluptas unde officia dolor vel!</p>
        <Card>
          <CardTitle></CardTitle>


        </Card>
      </div>
      <div className="container mx-auto py-5">
        <DataTable columns={columns} data={user ?? []} />
      </div>
    </div>
  )
}