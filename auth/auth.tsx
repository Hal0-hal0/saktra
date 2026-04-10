'use client';
import { useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { Button } from "@/components/ui/button"
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { sign } from "crypto";

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if(!email || !password) {
      toast.error('Please enter you Email and Password!', {position: "top-center"})
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      if (signInError.message === "Invalid login credentials"){
        toast.error('Invalid email or password', {position: "top-center"})
      } else if (signInError.message === 'Email not confirmed') {
        toast.error('Please verify your email first', {position: "top-center"})
      } else {
        toast.error(signInError.message, {position: "top-center"})
      }
      return;
    }
    toast.success("Logged in succesfully!", {position:"top-center"})
  }
  
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Login to your account</CardTitle>
        <CardDescription>
          Enter your email below to login to your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-6">
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                onChange={(e:ChangeEvent<HTMLInputElement>) =>
                  setEmail(e.target.value)
                }
                value={email}
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                <a
                  href="#"
                  className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                >
                  Forgot your password?
                </a>
              </div>
              <Input 
                id="password" 
                type="password" 
                onChange={(e:ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                value={password}
              />
            </div>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full" >
                  Login
                </Button>
            </CardFooter>
          </div>
        </form>
      </CardContent>

    </Card>
  )
}
