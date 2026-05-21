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
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog"
import { UserPlus2Icon } from "lucide-react"
import { bodPositions, departmentOptions } from "@/lib/member-evaluation"


export function ButtonInviteUser() {
  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('user')
  const [bodPosition, setBodPosition] = useState('')
  const [department, setDepartment] = useState('')
  const [position, setPosition] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submit, setSubmit] = useState(false)

  const isExecutiveInvite = selectedRole === 'executive'
  const isBodInvite = selectedRole === 'bod'
  const isMemberInvite = selectedRole === 'user'

  const resetForm = () => {
    setOpen(false)
    setSelectedRole('user')
    setBodPosition('')
    setDepartment('')
    setPosition('')
    setEmail('')
    setPassword('')
    setSubmit(false)
  }

  const isDirty =
    email.trim().length > 0 ||
    password.trim().length > 0 ||
    selectedRole !== 'user' ||
    bodPosition.trim().length > 0 ||
    position.trim().length > 0 ||
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

  const validate = (): string | null => {
    if (!email || !selectedRole || !password) return 'Please fill in all fields'
    if ((isExecutiveInvite || isMemberInvite) && !department) return 'Please select a department.'
    if (isBodInvite && !bodPosition) return 'Please select a BOD position.'
    return null
  }

  const handleCreateUser = async () => {
    const validationError = validate()
    if (validationError) {
      toast.error(validationError, { position: 'top-center' })
      throw new Error(validationError)
    }
    setSubmit(true)

    const nextDepartment = (isExecutiveInvite || isMemberInvite) ? department : ''
    const nextPosition = isBodInvite
      ? bodPosition
      : isExecutiveInvite
        ? 'Executive Member'
        : position || 'Member'

    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          role: selectedRole,
          position: nextPosition,
          department: nextDepartment,
        })
      })
      const { error } = await res.json()

      if (error) {
        toast.error(error, { position: 'top-center' })
        throw new Error(error)
      }

      toast.success('User created successfully!', { position: 'top-center' })
      resetForm()
    } finally {
      setSubmit(false)
    }
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
                <Select
                  value={selectedRole}
                  onValueChange={(value) => {
                    setSelectedRole(value)
                    setDepartment('')
                    setPosition('')
                    setBodPosition('')
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Member</SelectItem>
                    <SelectItem value="executive">Executive Member</SelectItem>
                    <SelectItem value="bod">Board of Directors</SelectItem>
                  </SelectContent>
                </Select>
            </Field>
            {isExecutiveInvite || isMemberInvite ? (
            <Field>
                <Label>Department</Label>
                <Select value={department} onValueChange={(value) => {
                  setDepartment(value)
                  setPosition('')
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </Field>
            ) : null}

            {isMemberInvite && department ? (
            <Field>
                <Label>
                  Position{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional — defaults to Member)</span>
                </Label>
                <Select value={position} onValueChange={setPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a position (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {departmentOptions.find((item) => item.value === department)?.positions.map((pos) => (
                      <SelectItem key={pos} value={pos}>
                        {pos}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </Field>
            ) : null}

            {isBodInvite ? (
            <Field>
                <Label>BOD Position</Label>
                <Select value={bodPosition} onValueChange={setBodPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a BOD position" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodPositions.map((position) => (
                      <SelectItem key={position} value={position}>
                        {position}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </Field>
            ) : null}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
            <ConfirmActionDialog
              title={<>Invite <span className="font-bold">{email || 'this user'}</span>?</>}
              description="The user will be created with the temporary password shown and will need to complete their account setup on first login."
              confirmLabel="Send invite"
              icon={<UserPlus2Icon className="size-5" />}
              onConfirm={handleCreateUser}
            >
              <Button type="button">
                {submit && <Spinner data-icon="inline-start" />}
                Add User
              </Button>
            </ConfirmActionDialog>
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
