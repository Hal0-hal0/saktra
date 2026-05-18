'use client'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"
import React, { useState } from "react"
import { DiscardChangesAlert } from "@/components/ui/discard-changes-alert"
import { useUnsavedChangesGuard } from "@/lib/use-unsaved-changes-guard"
import { ConfirmActionDialog } from "@/components/admin/confirm-action-dialog"
import { bodPositions, departmentOptions, normalizeEvaluationRole } from "@/lib/member-evaluation"
import { PencilLineIcon } from "@/components/icons/lucide-pencil-line"

type UpdateDrawerUser = {
  user_id: string
  user_name: string
  email: string
  role: string
  status: string
  department: string
  position: string
}

const UpdateDrawer = ({
  children,
  user,
}: {
  children: React.ReactNode
  user: UpdateDrawerUser
}) => {
  const initialUserName = !user.user_name || user.user_name === "null" ? "Member" : user.user_name
  // Normalize 'admin' DB value to the 'bod' UI value so they share controls;
  // older records may still store 'admin'.
  const initialRole = normalizeEvaluationRole(user.role) === "admin" ? "bod" : normalizeEvaluationRole(user.role)
  const initialDepartment = user.department ?? ""
  const initialPosition = user.position ?? ""
  const initialStatus = user.status ?? "active"
  const initialEmail = user.email ?? ""

  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState(initialUserName)
  const [role, setRole] = useState<string>(initialRole)
  const [email, setEmail] = useState(initialEmail)
  const [status, setStatus] = useState(initialStatus)
  const [department, setDepartment] = useState(initialDepartment)
  const [position, setPosition] = useState(initialPosition)
  const [bodPosition, setBodPosition] = useState(initialRole === "bod" ? initialPosition : "")

  const isExecutive = role === "executive"
  const isBod = role === "bod"
  const isMember = role === "user"

  const resetForm = () => {
    setUserName(initialUserName)
    setRole(initialRole)
    setEmail(initialEmail)
    setStatus(initialStatus)
    setDepartment(initialDepartment)
    setPosition(initialPosition)
    setBodPosition(initialRole === "bod" ? initialPosition : "")
    setLoading(false)
    setOpen(false)
  }

  const isDirty =
    userName !== initialUserName ||
    role !== initialRole ||
    email !== initialEmail ||
    status !== initialStatus ||
    department !== initialDepartment ||
    position !== initialPosition ||
    (isBod && bodPosition !== initialPosition)

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

  const validate = (): string | null => {
    if (!email.trim()) return "Email is required."
    if (!role) return "Role is required."
    if ((isExecutive || isMember) && !department) return "Please select a department."
    if (isMember && !position) return "Please select a position."
    if (isBod && !bodPosition) return "Please select a BOD position."
    return null
  }

  const submitUpdate = async () => {
    const validationError = validate()
    if (validationError) {
      toast.error(validationError, { position: "top-center" })
      throw new Error(validationError)
    }

    setLoading(true)
    try {
      const nextDepartment = isExecutive || isMember ? department : ""
      const nextPosition = isBod
        ? bodPosition
        : isExecutive
          ? "Executive Member"
          : isMember
            ? position || "Member"
            : initialPosition

      const res = await fetch('/api/update-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role,
          position: nextPosition,
          department: nextDepartment,
          user_id: user.user_id,
          user_name: userName,
          status,
        }),
      })
      const { error } = await res.json()

      if (error) {
        toast.error(error, { position: 'top-center' })
        throw new Error(error)
      }

      toast.success('User updated successfully!', { position: 'top-center' })
      resetForm()
    } finally {
      setLoading(false)
    }
  }

  const availablePositions =
    departmentOptions.find((item) => item.value === department)?.positions ?? []

  return (
    <>
      <Drawer direction="left" open={open} onOpenChange={(nextOpen) => handleOpenChange(nextOpen, setOpen)}>
        <DrawerTrigger asChild onClick={() => setOpen(true)}>
          {children}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Update User</DrawerTitle>
            <DrawerDescription>
              Editing <strong>{user.user_name}</strong>
            </DrawerDescription>
          </DrawerHeader>

          <div className="mx-5">
            <FieldSet className="w-full max-w-xs">
              <FieldGroup>
                <Field>
                  <FieldLabel>Username</FieldLabel>
                  <Input
                    id="username"
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                  />
                  <FieldDescription>Choose a unique username.</FieldDescription>
                </Field>

                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel>Role</FieldLabel>
                  <Select
                    value={role}
                    onValueChange={(value) => {
                      setRole(value)
                      setDepartment("")
                      setPosition("")
                      setBodPosition("")
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

                <Field>
                  <FieldLabel>Status</FieldLabel>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {(isExecutive || isMember) && (
                  <Field>
                    <FieldLabel>Department</FieldLabel>
                    <Select
                      value={department}
                      onValueChange={(value) => {
                        setDepartment(value)
                        setPosition("")
                      }}
                    >
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
                )}

                {isMember && department && (
                  <Field>
                    <FieldLabel>Position</FieldLabel>
                    <Select value={position} onValueChange={setPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a position" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePositions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}

                {isBod && (
                  <Field>
                    <FieldLabel>BOD Position</FieldLabel>
                    <Select value={bodPosition} onValueChange={setBodPosition}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a BOD position" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodPositions.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              </FieldGroup>
            </FieldSet>
          </div>

          <DrawerFooter>
            <ConfirmActionDialog
              title={<>Save changes to <span className="font-bold">{userName}</span>?</>}
              description="The user's profile will be updated immediately."
              confirmLabel="Save changes"
              icon={<PencilLineIcon />}
              onConfirm={submitUpdate}
            >
              <Button type="button" disabled={!isDirty || loading}>
                {loading && <Spinner />}
                Update
              </Button>
            </ConfirmActionDialog>
            <Button type="button" variant="outline" onClick={requestClose}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
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

export default UpdateDrawer
