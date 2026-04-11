'use client'
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase/supabase-client"
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

  
export function ButtonInviteUser() {
  const [open, setOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState('user')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    const username = value.split('@')[0]
    const year = new Date().getFullYear()
    setPassword(username ? `${username}-${year}` : '')
  }

  const handleCreateUser = async () => {
    if (!email || !selectedRole || !password) {
      toast.error('Please fill in all fields' ,{position:"top-center"})
      return
    }

    const res = await fetch('/api/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, role:selectedRole })
    })
 
    const { data, error } = await res.json()
    
    if (error) {         
      toast.error(error, {position:'top-center'})
      return
    }

    toast.success('User created successfully!', {position:'top-center'})
    setOpen(false)
    setEmail('')
    setPassword('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form>
        <DialogTrigger asChild>
          <Button variant="default">Invite a Member</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Invite</DialogTitle>
            <DialogDescription>
              Upon submission, the user will be sent an email invitation to access SackTrack.            
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="name-1">Email</Label>
              <Input 
                id="name-1" 
                name="name" 
                placeholder="m@gmail.com"  
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
                <Select onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateUser}>Add User</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  )
}
