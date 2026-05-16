'use client'
import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { SkeletonText } from "@/components/skeleton/skeleton-text";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import {
  User, Phone, MapPin, GraduationCap, Building2, Calendar,
  Mail, Shield, Edit3, Save, X, Camera, ChevronLeft,
  BadgeCheck, CreditCard, Clock
} from "lucide-react";
import Link from "next/link";

type Profile = {
  user_id: string;
  user_name: string;
  full_name: string;
  email: string;
  role: string;
  role_title: string;
  status: string;
  membership_status: string;
  membership_expires_at: string | null;
  phone: string;
  birthday: string;
  home_address: string;
  school: string;
  department: string;
  year_joined: string;
  contact_person: string;
  contact_person_relationship: string;
  contact_person_phone: string;
  avatar_url: string | null;
};

const Profile = () => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avgScore, setAvgScore] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const getUser = async () => {
    const { data: claims } = await supabase.auth.getClaims();
    const userId = claims?.claims?.sub;

    const { data: details } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    setUser(details);
    setloading(false)
  }

  useEffect(() => {
    getUser()
  }, [])

  return (
    <div>
      {!loading ? (
        <>
          <h1 className='font-bold text-4xl mb-4'>Profile</h1>
          <div className="space-y-2">
            <h3><span className="font-semibold">Username:</span> {user?.user_name}</h3>
            <h3><span className="font-semibold">Role:</span> <span className="capitalize">{user?.role}</span></h3>
            <h3><span className="font-semibold">Email:</span> {user?.email}</h3>
            <h3>
              <span className="font-semibold">Account Status:</span>{' '}
              <span className="capitalize">{user?.status}</span>
            </h3>
            <h3>
              <span className="font-semibold">Membership Status:</span>{' '}
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${user?.membership_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {user?.membership_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </h3>
            {user?.membership_status === 'paid' && user?.membership_expires_at && (
              <h3>
                <span className="font-semibold">Membership Expires:</span>{' '}
                {new Date(user.membership_expires_at).toLocaleDateString()}
              </h3>
            )}
          </div>
        </>

      ) : (
        <SkeletonText />
      )}


    </div>
  )
}

export default Profile;