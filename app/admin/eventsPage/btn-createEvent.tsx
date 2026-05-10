'use client'
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useState, useEffect } from "react"
import { toast } from 'sonner'
import { format } from "date-fns"
import { ChevronDownIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { FieldLabel } from "@/components/ui/field"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DiscardChangesAlert } from "@/components/ui/discard-changes-alert"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"
import { EventProvider, useEvent } from "./event-provider"
import { Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem } from "@/components/ui/combobox"
import { supabase } from "@/lib/supabase/supabase-client"

export function ButtonCreateEvent() {
  const [openModal, setOpenModal] = useState(false)
  const [dateStart, setDateStart] = useState<Date | undefined>(new Date())
  const [dateEnd, setDateEnd] = useState<Date | undefined>(new Date())
  const [timeStart, setTimeStart] = useState('10:30:00')
  const [timeEnd, setTimeEnd] = useState('10:30:00')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [venue, setVenue] = useState('')
  const [eventChairId, setEventChairId] = useState<string>('')
  const [vcId, setVcId] = useState<string>('')
  const [submit, setSubmit] = useState(false)
  const [open, setOpen] = useState(false)
  const [openEnd, setOpenEnd] = useState(false)
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    const fetchProfiles = async () => {
      const { data } = await supabase.from('profiles').select('*')
      setProfiles(data || [])
    }
    fetchProfiles()
  }, [])

  const resetForm = () => {
    setOpenModal(false)
    setDateStart(new Date())
    setDateEnd(new Date())
    setTimeStart('10:30:00')
    setTimeEnd('10:30:00')
    setName('')
    setDescription('')
    setLocation('')
    setVenue('')
    setEventChairId('')
    setVcId('')
    setSubmit(false)
    setOpen(false)
    setOpenEnd(false)
  }

  const isDirty =
    name.trim().length > 0 ||
    description.trim().length > 0 ||
    location.trim().length > 0 ||
    venue.trim().length > 0 ||
    timeStart !== '10:30:00' ||
    timeEnd !== '10:30:00' ||
    eventChairId !== '' ||
    vcId !== ''

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

  const handleCreateEvent = async () => {
    setSubmit(true)

    if (!canSubmit) {
      toast.error('End date/time must be after start date/time', { position: 'top-center' })
      setSubmit(false)
      return
    }

    if (!dateStart || !dateEnd || !timeStart || !timeEnd || !location || !name || !venue) {
      toast.error('Please Fill In All Fields', { position: 'top-center' })
      setSubmit(false)
      return
    }

    const res = await fetch('/api/create-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_start: format(dateStart, 'yyyy-MM-dd'),
        date_end: format(dateEnd, 'yyyy-MM-dd'),
        name,
        description,
        location,
        venue,
        time_start: timeStart,
        time_end: timeEnd,
        event_chair_id: eventChairId || null,
        vc_id: vcId || null,
      })
    })
    const { error } = await res.json()

    if (error) {
      toast.error(error, { position: 'top-center' })
      setSubmit(false)
      return
    }

    toast.success('Event Created Successfully!', { position: 'top-center' })
    resetForm()
  }

  return (
    <>
    <Dialog open={openModal} onOpenChange={(nextOpen) => handleOpenChange(nextOpen, setOpenModal)}>
      <DialogTrigger asChild>
        <Button variant="default">Create Event</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create Event</DialogTitle>
          <DialogDescription>
            Upon submission, members can now join the event.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="name-1">Name</Label>
            <Input
              id="name-1"
              name="name"
              placeholder="Outreach"
              type="text"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="description">Description</Label>
            <Textarea
              placeholder="Optional"
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Location</FieldLabel>
            <Input
              placeholder="Iloilo city"
              onChange={(e) => setLocation(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel>Venue</FieldLabel>
            <Input
              placeholder="Hotel 321"
              onChange={(e) => setVenue(e.target.value)}
            />
          </Field>
          <div className="flex flex-row gap-5">
            <Field>
              <Label>Event Chair (Optional)</Label>
              <Combobox value={eventChairId} onValueChange={(val) => setEventChairId(val || "")}>
                <ComboboxInput
                  placeholder="Select event chair..."
                  showClear
                />
                <ComboboxContent>
                  <ComboboxList>
                    {profiles.map((profile) => (
                      <ComboboxItem key={profile.id} value={profile.user_id}>
                        {profile.user_name}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
            <Field>
              <Label>Vice Chair (Optional)</Label>
              <Combobox value={vcId} onValueChange={(val) => setVcId(val || "")}>
                <ComboboxInput
                  placeholder="Select vice chair..."
                  showClear
                />
                <ComboboxContent>
                  <ComboboxList>
                    {profiles.map((profile) => (
                      <ComboboxItem key={profile.id} value={profile.user_id}>
                        {profile.user_name}
                      </ComboboxItem>
                    ))}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </Field>
          </div>
          <div className="flex flex-row gap-5">
            <Field>
              <Label>Date</Label>
              <FieldGroup className="mx-auto max-w-xs flex-row">
                <Field>
                  <FieldLabel htmlFor="date-start">Date Start</FieldLabel>
                  <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date-start"
                        className="w-32 justify-between font-normal"
                      >
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
                          setOpen(false)
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                  <FieldLabel htmlFor="date-end">Date End</FieldLabel>
                  <Popover open={openEnd} onOpenChange={setOpenEnd}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        id="date-end"
                        className="w-32 justify-between font-normal"
                      >
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
              <Label>Time</Label>
              <FieldGroup className="mx-auto max-w-xs flex-row">
                <Field className="w-32">
                  <FieldLabel htmlFor="time-start">Time Start</FieldLabel>
                  <Input
                    type="time"
                    id="time-start"
                    step="1"
                    defaultValue="10:30:00"
                    className="appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                    onChange={(e) => setTimeStart(e.target.value)}
                  />
                </Field>
                <Field className="w-32">
                  <FieldLabel htmlFor="time-end">Time End</FieldLabel>
                  <Input
                    type="time"
                    id="time-end"
                    step="1"
                    defaultValue="10:30:00"
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
          <Button type="button" onClick={handleCreateEvent}>
            {submit && <Spinner data-icon="inline-start" />}
            Add Event
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
