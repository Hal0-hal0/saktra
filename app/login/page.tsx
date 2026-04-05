'use client';
import { Auth } from "@/auth/auth";
import { supabase } from "@/lib/supabase/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


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
        .select('role')
        .eq('user_id', session.user.id)
        .single()

        console.log('profile:', profile)  // ← what does this log?
        console.log('error:', error)      // ← any error?
        console.log('user id:', session.user.id)  // ← what is the user id?

        if(profile?.role === 'admin') {
          router.push('/admin'); // redirect to /admin if user is admin
        } else {
          router.push('/users'); // redirect to /users if user is not admin
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
    </div>
  );
}
