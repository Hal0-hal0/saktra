'use client';
import { useState, FormEvent, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { Button } from "@/components/ui/button"
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
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
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"

export function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState (false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true)

    if(!email || !password) {
      toast.error('Please enter you Email and Password!', {position: "top-center"})
      setLoading(false)
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
      setLoading(false)
      return;
    }
    toast.success("Logged in succesfully!", {position:"top-center"})
    setLoading(false)
  }

  return (
    <Card className="w-full max-w-sm backdrop-blur-md bg-white/70 dark:bg-black/40 border-white/20">
      <CardHeader className="flex flex-col items-center text-center">
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
                placeholder="youremail@gmail.com"
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
              <PasswordInput
                id="password"
                onChange={(e:ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
                value={password}
              />
            </div>
              <CardFooter className="flex-col gap-2">
                <Button type="submit" className="w-full" >
                  {loading && <><Spinner/></>}
                  Login
                </Button>
            </CardFooter>
          </div>
        </form>
      </CardContent>

    </Card>
  )
}
