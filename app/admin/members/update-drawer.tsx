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



const UpdateDrawer = ({
  children,
  user,
}: {
  children: React.ReactNode
  user: {
    user_id: string
    user_name: string
    email: string
    role: string
    status: string
    department: string
    position:string
  }
    }) => {

    const [loading, setLoading] = useState (false)
    const [open, setOpen] = useState (false)
    const [userName, setUserName] = useState(
        !user.user_name || user.user_name === "null" ? "Member" : user.user_name
    )
    const [role, setRole] = useState(user.role)
    const [email, setEmail] = useState(user.email)
    const [status, setStatus] = useState(user.status)
    const [position, setPosition] = useState(user.position)
    const [department, setDepartment] = useState(user.department)

    const initialState = {
      userName: !user.user_name || user.user_name === "null" ? "Member" : user.user_name,
      role: user.role,
      email: user.email,
      status: user.status,
      position: user.position,
      department: user.department,
    }

    const resetForm = () => {
      setUserName(initialState.userName)
      setRole(initialState.role)
      setEmail(initialState.email)
      setStatus(initialState.status)
      setPosition(initialState.position)
      setDepartment(initialState.department)
      setLoading(false)
      setOpen(false)
    }

    const isDirty =
      userName !== initialState.userName ||
      role !== initialState.role ||
      email !== initialState.email ||
      status !== initialState.status ||
      position !== initialState.position ||
      department !== initialState.department

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

    const handleUpdate = async () => {
      setLoading(true)

      const res = await fetch('/api/update-user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role:role, position:position,department:department, user_id:user.user_id, user_name:userName, status })
      })
      const { error } = await res.json()

      if (error) {
        toast.error(error, {position:'top-center'})
        setLoading(false)
        return
      }

      toast.success('User Updated Successfully!', {position:'top-center'})
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
                        <FieldLabel >Username</FieldLabel>
                        <Input 
                            id="username" 
                            type="text"  
                        value={userName} onChange={(e) => setUserName(e.target.value)}
                        />
                        
                        <FieldDescription>
                            Choose a unique username for your account.
                        </FieldDescription>
                    </Field>
                    <Field>
                        <FieldLabel >Update Role</FieldLabel>
                            <Select  value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="user">User</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="executive">Executive</SelectItem>
                                </SelectContent>
                            </Select>
                    </Field>

                      <Field>
                        <FieldLabel >Update Status</FieldLabel>
                            <Select  value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                </SelectContent>
                            </Select>
                    </Field>
                    <Field>
                        <FieldLabel >Update Department</FieldLabel>
                            <Select value={department} onValueChange={setDepartment}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Position" />
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
                        <FieldLabel >Update Position</FieldLabel>
                            <Select value={position} onValueChange={setPosition}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {(departmentPositions[department] ?? []).map((pos) => (
                                        <SelectItem key={pos} value={pos}>
                                            {pos}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                    </Field>
                </FieldGroup>
            </FieldSet>
        </div>

        <DrawerFooter>
          <Button type="button" onClick={handleUpdate}>
            {loading && <><Spinner/></>}
            Update
          </Button>
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
