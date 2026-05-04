'use client'
import React, { useState } from 'react'
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from 'sonner'
import { format, parse } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DiscardChangesAlert } from "@/components/ui/discard-changes-alert"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"

type Event = {
  id: string
  name: string
  description: string
  location: string
  venue: string
  date_start: string
  date_end: string
  time_start: string
  time_end: string
}

const UpdateEvent = ({ children, event }: {
  children: React.ReactNode
  event: Event
}) => {
  const [name, setName] = useState(event?.name ?? '')
  const [description, setDescription] = useState(event?.description ?? '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [dateStart, setDateStart] = useState<Date | undefined>(
    event?.date_start ? parse(event.date_start, 'yyyy-MM-dd', new Date()) : undefined
  )
  const [dateEnd, setDateEnd] = useState<Date | undefined>(
    event?.date_end ? parse(event.date_end, 'yyyy-MM-dd', new Date()) : undefined
  )
  const [timeStart, setTimeStart] = useState(event?.time_start ?? '')
  const [timeEnd, setTimeEnd] = useState(event?.time_end ?? '')
  const [submit, setSubmit] = useState(false)
  const [open, setOpen] = useState(false)
  const [openStart, setOpenStart] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)

  const initialState = {
    name: event?.name ?? '',
    description: event?.description ?? '',
    location: event?.location ?? '',
    venue: event?.venue ?? '',
    dateStart: event?.date_start ? parse(event.date_start, 'yyyy-MM-dd', new Date()) : undefined,
    dateEnd: event?.date_end ? parse(event.date_end, 'yyyy-MM-dd', new Date()) : undefined,
    timeStart: event?.time_start ?? '',
    timeEnd: event?.time_end ?? '',
  }

  const resetForm = () => {
    setName(initialState.name)
    setDescription(initialState.description)
    setLocation(initialState.location)
    setVenue(initialState.venue)
    setDateStart(initialState.dateStart)
    setDateEnd(initialState.dateEnd)
    setTimeStart(initialState.timeStart)
    setTimeEnd(initialState.timeEnd)
    setSubmit(false)
    setOpenStart(false)
    setOpenEnd(false)
    setOpen(false)
  }

  const isDirty =
    name !== initialState.name ||
    description !== initialState.description ||
    location !== initialState.location ||
    venue !== initialState.venue ||
    dateStart?.getTime() !== initialState.dateStart?.getTime() ||
    dateEnd?.getTime() !== initialState.dateEnd?.getTime() ||
    timeStart !== initialState.timeStart ||
    timeEnd !== initialState.timeEnd

  const {
    cancelDiscard,
    confirmDiscard,
    confirmOpen,
    handleOpenChange,
    requestClose,
    setConfirmOpen,
  } = useUnsavedChangesGuard({
    isDirty,
    onDiscard: resetForm,
  })

  const canSubmit = (() => {
    if (!dateStart || !dateEnd) {
      return false
    }

    const start = new Date(dateStart)
    const end = new Date(dateEnd)

    const [startH, startM, startS] = timeStart.split(':').map(Number)
    const [endH, endM, endS] = timeEnd.split(':').map(Number)

    start.setHours(startH, startM, startS)
    end.setHours(endH, endM, endS)

    return end >= start
  })()

  const handleUpdate = async () => {
    setSubmit(true)

    if (!canSubmit) {
      toast.error('End date/time must be after start date/time', { position: 'top-center' })
      setSubmit(false)
      return
    }

    if (!name || !location || !venue || !dateStart || !dateEnd || !timeStart || !timeEnd) {
      toast.error('Please fill in all fields', { position: 'top-center' })
      setSubmit(false)
      return
    }

    const res = await fetch('/api/update-event', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: event.id,
        name,
        description,
        location,
        venue,
        date_start: format(dateStart, 'yyyy-MM-dd'),
        date_end: format(dateEnd, 'yyyy-MM-dd'),
        time_start: timeStart,
        time_end: timeEnd,
      })
    })

    const { error } = await res.json()

    if (error) {
      toast.error(error, { position: 'top-center' })
      setSubmit(false)
      return
    }

    toast.success('Event updated successfully!', { position: 'top-center' })
    resetForm()
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => handleOpenChange(nextOpen, setOpen)}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="capitalize">{event?.name}</DialogTitle>
          <DialogDescription>Update event details.</DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel>Event Name</FieldLabel>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>Venue</FieldLabel>
            <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
          </Field>
          <div className="flex flex-row gap-5">
            <Field>
              <FieldLabel>Date</FieldLabel>
              <FieldGroup className="mx-auto max-w-xs flex-row">
                <Field>
                  <FieldLabel>Date Start</FieldLabel>
                  <Popover open={openStart} onOpenChange={setOpenStart}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32 justify-between font-normal">
                        {dateStart ? format(dateStart, "PPP") : "Select date"}
                        <ChevronDownIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateStart}
                        captionLayout="dropdown"
                        defaultMonth={dateStart}
                        onSelect={(date) => {
                          setDateStart(date)
                          setDateEnd(date)
                          setOpenStart(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldLabel>Date End</FieldLabel>
                  <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-32 justify-between font-normal">
                        {dateEnd ? format(dateEnd, "PPP") : "Select date"}
                        <ChevronDownIcon />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateEnd}
                        captionLayout="dropdown"
                        defaultMonth={dateEnd}
                        onSelect={(date) => {
                          setDateEnd(date)
                          setOpenEnd(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </Field>
              </FieldGroup>
            </Field>
            <Field>
              <FieldLabel>Time</FieldLabel>
              <FieldGroup className="mx-auto max-w-xs flex-row">
                <Field className="w-32">
                  <FieldLabel>Time Start</FieldLabel>
                  <Input
                    type="time"
                    step="1"
                    value={timeStart}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    onChange={(e) => setTimeStart(e.target.value)}
                  />
                </Field>
                <Field className="w-32">
                  <FieldLabel>Time End</FieldLabel>
                  <Input
                    type="time"
                    step="1"
                    value={timeEnd}
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    onChange={(e) => setTimeEnd(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </Field>
          </div>
        </FieldGroup>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={requestClose}>
            Cancel
          </Button>
          <Button type="button" onClick={handleUpdate} disabled={submit}>
            {submit && <Spinner data-icon="inline-start" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <DiscardChangesAlert
      open={confirmOpen}
      onOpenChange={(nextOpen) => {
        setConfirmOpen(nextOpen)
        if (!nextOpen) {
          cancelDiscard()
        }
      }}
      onConfirm={confirmDiscard}
    />
    </>
  )
}

export default UpdateEvent
