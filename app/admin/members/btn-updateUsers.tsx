'use client'
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
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

  
export function ButtonUpdateUser({children, user}:{
    children: React.ReactNode
    user: {
        user_id: string
        user_name: string
        email: string
        role: string
        status: string
        created_at: Date
    }
  }) {
  const [open, setOpen] = useState(false)
  const [openConfirmation, setOpenConfirmation] = useState(false)
  const [userName, setUserName] = useState(user.user_name)
  const [role, setRole] = useState(user.role)
  const [email, setEmail] = useState(user.email)
  const [status, setStatus] = useState(user.status)

  console.log(userName,role,email,status)


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Update User</DialogTitle>
            <DialogDescription>
              Upon submission...            
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Username</Label>
              <Input 
                id="name-1" 
                name="name" 
                placeholder="John Doe"  
                value={userName} onChange={(e) => setUserName(e.target.value)}
                type="text"
                // onChange={handleEmailChange} 
              />
              
            </Field>
            <Field>
              <Label htmlFor="name-1">Email</Label>
              <Input 
                id="name-1" 
                name="name" 
                placeholder="m@gmail.com"  
                value={email} onChange={(e) => setUserName(e.target.value)}
                type="email"
                // onChange={handleEmailChange} 
              />
              
            </Field>
            <Field>
                <Label>Role</Label>
                <Select defaultValue={role}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
            </Field>

            <Field>
                <Label>Status</Label>
                <Select defaultValue={status}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
                <AlertDialog open={openConfirmation} onOpenChange={setOpenConfirmation}>
                    <AlertDialogTrigger asChild onClick={() => setOpen(true)}>
                        <Button >
                            {/* {submit &&  <><Spinner data-icon="inline-start" /></>} */}
                            
                            Update User
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent size="sm">
                    <AlertDialogHeader>
                        <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                        </AlertDialogMedia>
                        <AlertDialogTitle>Do you want to update this user?</AlertDialogTitle>
                        <AlertDialogDescription>
                        This action is...
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" >Confirm</AlertDialogAction>
                    </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
