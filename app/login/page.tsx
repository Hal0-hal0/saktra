'use client';
import { Auth } from "@/auth/auth";
import { supabase } from "@/lib/supabase/supabase-client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ModeToggle } from "@/components/mode-toggle";

export default function Home() {
   const [session, setSession] = useState<any>(undefined);
   const router = useRouter();

  const redirectByProfile = async (session: any) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, status, is_setup_complete')
      .eq('user_id', session.user.id)
      .single();

    // New users must complete account setup first
    if (!profile?.is_setup_complete) {
      router.push('/account-setup');
      return;
    }

    if (profile?.status === 'active') {
      if (profile?.role === 'admin') {
        router.push('/admin');
      } else if (profile?.role === 'user') {
        router.push('/users');
      } else {
        router.push('/exec');
      }
    } else {
      router.push('/inactive');
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        redirectByProfile(session);
      }
    });

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session) {
        await redirectByProfile(session);
      }
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
