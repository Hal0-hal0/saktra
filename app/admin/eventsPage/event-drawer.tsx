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
import { useEvent } from './event-provider'

const EventDrawer = ({ children,eventId }: { children: React.ReactNode;
    eventId: string
}) => {
    const {events = []} = useEvent()
    const selectedEvent = events.find((p: any) => p.id === eventId)
    

    return (
    <Drawer direction='left'>
        <DrawerTrigger asChild>
            {children}
        </DrawerTrigger>
        <DrawerContent className='!w-full xl:!w-1/3 lg:!w-1/2 !max-w-none h-full'>
            <DrawerHeader>
                <DrawerTitle className='capitalize'>{selectedEvent?.name}</DrawerTitle>
                <DrawerDescription>Display's Profiles in the department</DrawerDescription>
            </DrawerHeader>
            <div className='mx-5 overflow-hidden'>
                {/* Adjust here */}
                <pre>{JSON.stringify(selectedEvent, null, 2)}</pre> 
            </div>
            <DrawerFooter>
                <Button>Update</Button>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
  )
}

export default EventDrawer