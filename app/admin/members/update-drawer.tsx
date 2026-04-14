'use client'
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
import React, { use, useEffect, useState } from "react"
type DrawerSide = "top" | "right" | "bottom" | "left"



const UpdateDrawer = ({
  children,
  user,
  side = "right",
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
  side?: DrawerSide
    }) => {

    const [loading, setLoading] = useState (false)
    const [userName, setUserName] = useState(
        !user.user_name || user.user_name === "null" ? "Member" : user.user_name
    )
    const [role, setRole] = useState(user.role)
    const [email, setEmail] = useState(user.email)
    const [status, setStatus] = useState(user.status)
    const [position, setPosition] = useState(user.position)
    const [department, setDepartment] = useState(user.department)

    console.log("Test: ", role,email,status,userName)

    const onSubmit = () =>{
        setLoading(true)
    }

    const nullUserName = () => {
        if (userName === "null") {
            setUserName('Not Set')
        } else {
            setUserName(userName)
        }
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

    console.log("Username: ",userName)



  return (
    
    <Drawer direction="left">
      <DrawerTrigger asChild>{children}</DrawerTrigger>
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
                                </SelectContent>
                            </Select>
                    </Field>
                    <Field>
                        <FieldLabel >Update Position</FieldLabel>
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
                        <FieldLabel >Update Department</FieldLabel>
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
          <Button onSubmit={onSubmit}>
            {loading && <><Spinner/></>}
            Submit
        </Button>
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}

export default UpdateDrawer