'use client';
import { Auth } from "@/auth/auth";
import { supabase } from "@/lib/supabase/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
   const [session, setSession] = useState<any>(undefined);
   const router = useRouter();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); // store session directly, not data wrapper
      if (session) {
        console.log("Initial session:", session); // log the session object
        router.push('/users'); // redirect to /users if session exists
      }; // redirect to /user if session exists
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription} } = supabase.auth.onAuthStateChange(async(_event, session) => {
      setSession(session);
      console.log("Initial session:", session); // log the session object
      if (session) {
        const {data:profile,error} = await supabase
        .from('profiles')
        .select('role, status')
        .eq('user_id', session.user.id)
        .single()

        if (profile?.status === 'active') {
          if(profile?.role === 'admin') {
            router.push('/admin'); // redirect to /admin if user is admin
          } else if(profile?.role === 'user') {
            router.push('/users'); // redirect to /users if user is not admin
          } else {
            router.push('/exec'); // redirect to /exec if user is not admin or user
          }
        } else {
          router.push('/inactive')
        }

        
      } // redirect to /users on login
    });

    return () => subscription.unsubscribe();
  }, []);

  const logOut = async () => {
      await supabase.auth.signOut();
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
        {session ? null : <Auth />}
        <div className="absolute bottom-0 left-10 size-16 ">
          <ModeToggle/>
        </div>
    </div>
  );
}
