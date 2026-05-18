'use client'
import { columns, Payment } from "./columns"
import { DataTable } from "./data-table"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { useProfiles } from './profile-provider'

export default function CreateUserPage() {
  const {profiles} = useProfiles()

  // Treat legacy 'admin' role and current 'bod' role as the same group (BOD rename is UI-only).
  const bodCount = profiles.filter((p:any) => p.role === 'admin' || p.role === 'bod').length
  const userCount = profiles.filter((p:any) => p.role === 'user').length
  const activeCount = profiles.filter((p:any) => p.status === 'active').length
  const inactiveCount = profiles.filter((p:any) => p.status === 'inactive').length
  const execCount =  profiles.filter ((p:any) => p.role === 'executive').length

  return (
    <div>
      <div>
        <h1 className='font-bold text-xl'>Manage Members</h1>
        <div className='flex flex-col gap-5 mt-5  xl:flex-row lg:flex-row'>
          <Card size='default' className=' w-full max-w-sm'>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{bodCount}</h1>
            </CardContent>
            <CardHeader>
            </CardHeader>
            <CardFooter className='flex flex-col items-start'>
              <CardTitle className='font-bold'>Board of Directors (BOD)</CardTitle>
              <CardDescription>Total active Board of Directors in the organization</CardDescription>
            </CardFooter>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{execCount}</h1>
            </CardContent>
            <CardHeader> 
            </CardHeader>
            <CardFooter className='flex flex-col items-start'>
              <CardTitle className='font-bold'>Executive</CardTitle>
              <CardDescription>Total active Executives in the organization</CardDescription>
            </CardFooter>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{userCount}</h1>
            </CardContent>
            <CardHeader> 
            </CardHeader>
            <CardFooter className='flex flex-col items-start'>
              <CardTitle className='font-bold'>Members</CardTitle>
              <CardDescription>Total users in the organization except admins.</CardDescription>
            </CardFooter>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{activeCount}</h1>
            </CardContent>
            <CardHeader> 
            </CardHeader>
            <CardFooter className='flex flex-col items-start'>
              <CardTitle className='font-bold'>Active Status</CardTitle>
              <CardDescription>Total active users in the organization in all departments</CardDescription>
            </CardFooter>
          </Card>

          <Card size='default' className=' w-full max-w-sm'>
            <CardContent>
              <h1 className='text-5xl font-semibold'>{inactiveCount}</h1>
            </CardContent>
            <CardHeader> 
            </CardHeader>
            <CardFooter className='flex flex-col items-start'>
               <CardTitle className='font-bold'>Inactive Status</CardTitle>
              <CardDescription>Total inactive users in all departments</CardDescription>
            </CardFooter>
          </Card>


        </div>

      </div>
      <div className="container mx-auto py-5">
        <DataTable columns={columns} data={profiles} />
      </div>
    </div>
  )
}