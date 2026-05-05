'use client'
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react"
import { toast } from 'sonner'
import { DiscardChangesAlert } from "@/components/ui/discard-changes-alert"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"


export function ButtonInviteUser() {
  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('user')
  const [selectedPosition,setSelectedPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submit, setSubmit] = useState(false)

  const resetForm = () => {
    setOpen(false)
    setSelectedRole('user')
    setSelectedPosition('')
    setDepartment('')
    setEmail('')
    setPassword('')
    setSubmit(false)
  }

  const isDirty =
    email.trim().length > 0 ||
    password.trim().length > 0 ||
    selectedRole !== 'user' ||
    selectedPosition.trim().length > 0 ||
    department.trim().length > 0

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

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    const username = value.split('@')[0]
    const year = new Date().getFullYear()
    setPassword(username ? `${username}-${year}` : '')
  }

  const handleCreateUser = async () => {
    setSubmit(true)
    if (!email || !selectedRole || !password || !selectedPosition || !department) {
      toast.error('Please fill in all fields' ,{position:"top-center"})
      setSubmit(false)
      return
    }

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role:selectedRole, position:selectedPosition,department:department })
    })
    const { error } = await res.json()

    if (error) {
      toast.error(error, {position:'top-center'})
      setSubmit(false)
      return
    }

    toast.success('User created successfully!', {position:'top-center'})
    resetForm()
  }


  const departmentPositions: Record<string, string[]> = {
    'public relations': [
      'Marketing Officer',
      'Partnership and Sponsorship Officer',
      'Caption Writing Officer',
      'Member',
    ],
    'finance and administration': [
      'Secretariat Officer',
      'Human Resource Officer',
      'Finance Officer',
      'Member',
    ],
    'strategic operations': [
      'Project and Program',
      'Research and Development',
      'Logistics',
      'Member',
    ],
    'media and creatives': [
      'Productions Officer',
      'Creatives Officer',
      'Technicals Officer',
      'Member',
    ],
  }

  return (
    <>
    <Dialog open={open} onOpenChange={(nextOpen) => handleOpenChange(nextOpen, setOpen)}>
      <form>
        <DialogTrigger asChild>
          <Button variant="default">Invite a KaSAKDAG</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm" >
          <DialogHeader>
            <DialogTitle>Invite</DialogTitle>
            <DialogDescription>
              Upon submission, the user will be sent an email invitation to access SAKTRA.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Email</Label>
              <Input
                id="name-1"
                name="name"
                placeholder="youremail@gmail.com"
                type="email"
                onChange={handleEmailChange}
              />

            </Field>
            <Field>
              <Label htmlFor="username-1">Temporary Password</Label>
              <Input
                id="username-1"
                name="password"
                placeholder="email-year"
                value={password}
                type="text"
                onChange={(e) => setPassword(e.target.value)}
                readOnly
              />
            </Field>
            <Field>
                <Label>Role</Label>
                <Select onValueChange={setSelectedRole} defaultValue={selectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                  </SelectContent>
                </Select>
            </Field>
            <Field>
                <Label>Department</Label>
                <Select onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="finance and administration">Finance and Administration Department</SelectItem>
                    <SelectItem value="public relations">Public Relations Department</SelectItem>
                    <SelectItem value="media and creatives">Media and Creatives Department </SelectItem>
                    <SelectItem value="strategic operations" >Strategic Operations Department</SelectItem>
                  </SelectContent>
                </Select>
            </Field>
            <Field>
                <Label>Position</Label>
                <Select onValueChange={setSelectedPosition} disabled={!department || selectedRole === 'executive'}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a Position" />
                  </SelectTrigger>
                  <SelectContent>
                    {department && departmentPositions[department]
                      ? departmentPositions[department].map((pos) => (
                          <SelectItem key={pos} value={pos}>{pos}</SelectItem>
                        ))
                      : null
                    }
                  </SelectContent>
                </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateUser}>
              {submit &&  <><Spinner data-icon="inline-start" /></>}

              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
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
