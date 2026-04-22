import React from 'react'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from '@/components/ui/button'
import { useProfiles } from './realtime-fetch'

const DepartmentDrawer = ({ children,department }: { children: React.ReactNode 
    department: string
}) => {
    const {profiles} = useProfiles()
    const departmentProfiles = profiles.filter((p: any) => p.department === department)

    return (
    <Drawer direction='left'>
        <DrawerTrigger asChild>
            {children}
        </DrawerTrigger>
        <DrawerContent className='!w-full xl:!w-1/3 lg:!w-1/2 !max-w-none h-full'>
            <DrawerHeader>
                <DrawerTitle className='capitalize'>{department} Department</DrawerTitle>
                <DrawerDescription>Display's Profiles in the department</DrawerDescription>
            </DrawerHeader>
            <div className='mx-5'>
                <pre>{JSON.stringify(departmentProfiles, null, 2)}</pre>
            </div>
        </DrawerContent>
    </Drawer>
  )
}

export default DepartmentDrawer