'use client'
import { useState } from 'react'
import { columns, Payment } from "./columns"
import { DataTable } from "./data-table"
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/supabase-client'
import SkeletonMembers from './skeleton-members'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'


export default function CreateUserPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setloading] = useState(true)
  const [adminCount, setAdminCount] = useState<number>(0)
  const [activeCount, setActiveCount] = useState<number>(0)
  const [inactiveCount, setInactiveCount] = useState<number>(0)
  const [userCount, setUserCount] = useState<number>(0)


  const getUser = async () => {
    const {data, error} = await supabase 
    .from('profiles')
    .select('role,email,status,user_name,user_id,department,position,created_at')
    setUser(data ?? []);
    setloading(false)
  }

  const getCounts = async () => {
    const { count: admins } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    const { count: active } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    const { count: inactive } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'inactive')

    const { count: users } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')

    setAdminCount(admins ?? 0)
    setActiveCount(active ?? 0)
    setInactiveCount(inactive ?? 0)
    setUserCount(users ?? 0)
  }

  //realtime fetch
  useEffect (() => {
    getUser()
    getCounts()

    const channel = supabase
    .channel('profile')
    .on('postgres_changes',
      {event:'*', schema:'public', table:'profiles'},
      () => {
        getUser() //refetch when chnages
        getCounts()
      }
    )
    .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if(loading) {
    return <SkeletonMembers/>
  }

  return (
    <div>
      <div>
        <h1 className='font-bold text-xl'>Manage Members</h1>
        <p>Lorem ipsum dolor sit, amet consectetur adipisicing elit. Animi ea ratione deserunt consectetur accusantium hic, magnam consequatur, ab quasi repellat exercitationem, fugit amet magni eos voluptas unde officia dolor vel!</p>
        
        <div className='flex flex-col gap-5 mt-5  xl:flex-row lg:flex-row'>
          <Card size='default' className=' w-full max-w-sm'>
            <CardHeader>
              <CardTitle className='font-bold'>Admin</CardTitle>
              <CardDescription>Total admins in the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{adminCount}</h1>
            </CardContent>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardHeader>
              <CardTitle className='font-bold'>Members</CardTitle>
              <CardDescription>Total users in the organization except admins.</CardDescription>
            </CardHeader>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{userCount}</h1>
            </CardContent>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardHeader>
              <CardTitle className='font-bold'>Active Status</CardTitle>
              <CardDescription>Total active users in the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{activeCount}</h1>
            </CardContent>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardHeader>
              <CardTitle className='font-bold'>Inactive Status</CardTitle>
              <CardDescription>Total inactive users in the organization</CardDescription>
            </CardHeader>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{inactiveCount}</h1>
            </CardContent>
          </Card>
        </div>

      </div>
      <div className="container mx-auto py-5">
        <DataTable columns={columns} data={user ?? []} />
      </div>
    </div>
  )
}