'use client'
import React, { useState, useEffect, useRef, ChangeEvent } from "react";
import { supabase } from "@/lib/supabase/supabase-client";
import { SkeletonText } from "@/components/skeleton/skeleton-text";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Camera, Edit3, Save, X, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { UpdatePasswordDialog } from "@/components/profile/update-password-dialog";

type Profile = {
  user_id: string;
  user_name: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  role: string;
  role_title: string;
  status: string;
  membership_status: string;
  membership_expires_at: string | null;
  phone: string;
  phone_country_code: string;
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

const PROFILE_COUNTRY_CODES = [
  { code: '+63', label: '🇵🇭 +63' },
  { code: '+1',  label: '🇺🇸 +1' },
  { code: '+44', label: '🇬🇧 +44' },
  { code: '+61', label: '🇦🇺 +61' },
  { code: '+65', label: '🇸🇬 +65' },
  { code: '+60', label: '🇲🇾 +60' },
  { code: '+66', label: '🇹🇭 +66' },
  { code: '+91', label: '🇮🇳 +91' },
  { code: '+81', label: '🇯🇵 +81' },
  { code: '+82', label: '🇰🇷 +82' },
];

export default function ExecProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<Profile>>({});
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avgScore, setAvgScore] = useState<number>(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadProfile = async () => {
    try {
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims?.sub;
      if (!userId) return;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) { toast.error('Failed to load profile'); return; }
      setUser(profile);

      const { data: scores } = await supabase
        .from('user_scores')
        .select('average_score')
        .eq('user_id', userId);

      if (scores && scores.length > 0) {
        const avg = scores.reduce((s, r) => s + (r.average_score ?? 0), 0) / scores.length;
        setAvgScore(Math.round((avg / 5) * 100));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const openEdit = () => {
    setEditData({
      first_name: user?.first_name ?? '',
      last_name: user?.last_name ?? '',
      user_name: user?.user_name ?? '',
      phone: user?.phone ?? '',
      phone_country_code: user?.phone_country_code ?? '+63',
      birthday: user?.birthday ?? '',
      home_address: user?.home_address ?? '',
      school: user?.school ?? '',
      contact_person: user?.contact_person ?? '',
      contact_person_relationship: user?.contact_person_relationship ?? '',
      contact_person_phone: user?.contact_person_phone ?? '',
    });
    setEditing(true);
  };

  const TODAY = new Date().toISOString().slice(0, 10);

  const handleSave = async () => {
    const today = new Date().toISOString().slice(0, 10);
    if (!(editData.first_name ?? '').toString().trim()) { toast.error('First name is required'); return; }
    if (!(editData.last_name ?? '').toString().trim()) { toast.error('Last name is required'); return; }
    if (editData.phone && !/^(09\d{9}|9\d{9})$/.test(String(editData.phone))) { toast.error('Phone must be 09xxxxxxxxx (11 digits) or 9xxxxxxxxx (10 digits)'); return; }
    if (editData.contact_person_phone && !/^(09\d{9}|9\d{9})$/.test(String(editData.contact_person_phone))) { toast.error('Contact phone must be 09xxxxxxxxx (11 digits) or 9xxxxxxxxx (10 digits)'); return; }
    if (editData.birthday && String(editData.birthday) >= today) { toast.error('Birthday must be in the past'); return; }

    setSaving(true);
    try {
      const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? 'Update failed');
      toast.success('Profile updated successfully!');
      setUser(prev => prev ? {
        ...prev,
        ...editData,
        full_name: `${editData.first_name ?? prev.first_name ?? ''} ${editData.last_name ?? prev.last_name ?? ''}`.trim() || prev.full_name,
      } : prev);
      setEditing(false);
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { data: claims } = await supabase.auth.getClaims();
      const userId = claims?.claims?.sub;
      const ext = file.name.split('.').pop();
      const path = `avatars/${userId}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadErr) throw new Error(uploadErr.message);

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const avatarUrl = urlData.publicUrl + `?t=${Date.now()}`;

      const res = await fetch('/api/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar_url: avatarUrl }),
      });
      if (!res.ok) throw new Error('Failed to save avatar');
      setUser(prev => prev ? { ...prev, avatar_url: avatarUrl } : prev);
      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error(err.message ?? 'Upload failed');
    } finally {
      setAvatarUploading(false);
    }
  };

  const ch = (k: keyof Profile, v: string) => setEditData(p => ({ ...p, [k]: v }));

  const initials = (user?.full_name ?? user?.user_name ?? 'U')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  const isPaid = user?.membership_status === 'paid';
  const roleLabel = [user?.role?.toUpperCase(), user?.role_title?.toUpperCase()].filter(Boolean).join(' | ');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
          <p className="text-sm text-zinc-400">Loading profile…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="font-bold text-lg text-zinc-800 dark:text-zinc-100">Edit Profile</h2>
              <button onClick={() => setEditing(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="px-6 py-4 grid grid-cols-2 gap-4">
              <EditField label="First Name">
                <input value={editData.first_name ?? ''}
                  onChange={(e) => ch('first_name', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Last Name">
                <input value={editData.last_name ?? ''}
                  onChange={(e) => ch('last_name', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Username" wide>
                <input value={editData.user_name ?? ''}
                  onChange={(e) => ch('user_name', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Phone" wide>
                <div className="flex gap-2">
                  <select
                    value={editData.phone_country_code ?? '+63'}
                    onChange={(e) => ch('phone_country_code', e.target.value)}
                    className="profile-input !w-28 shrink-0"
                  >
                    {PROFILE_COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    inputMode="numeric"
                    pattern="\d*"
                    maxLength={10}
                    value={editData.phone ?? ''}
                    onChange={(e) => ch('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="9171234567"
                    className="profile-input flex-1"
                  />
                </div>
              </EditField>
              <EditField label="Birthday">
                <input type="date" value={editData.birthday ?? ''} max={TODAY}
                  onChange={(e) => ch('birthday', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="School">
                <input value={editData.school ?? ''}
                  onChange={(e) => ch('school', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Home Address" wide>
                <input value={editData.home_address ?? ''}
                  onChange={(e) => ch('home_address', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Contact Person">
                <input value={editData.contact_person ?? ''}
                  onChange={(e) => ch('contact_person', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Relationship">
                <input value={editData.contact_person_relationship ?? ''}
                  onChange={(e) => ch('contact_person_relationship', e.target.value)}
                  className="profile-input" />
              </EditField>
              <EditField label="Contact Person No." wide>
                <input
                  inputMode="numeric"
                  pattern="\d*"
                  maxLength={11}
                  placeholder="9171234567 or 09171234567"
                  value={editData.contact_person_phone ?? ''}
                  onChange={(e) => ch('contact_person_phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="profile-input"
                />
              </EditField>
              <div className="col-span-2 rounded-xl border border-amber-100 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                Department, Position, and Year Joined are assigned by the Board of Directors and cannot be edited here.
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setEditing(false)}
                className="px-4 py-2 text-sm font-semibold text-zinc-600 bg-zinc-100 rounded-lg hover:bg-zinc-200 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="px-5 py-2 text-sm font-semibold text-white bg-violet-600 rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                <Save size={14} />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-full space-y-4">

        {/* ── HERO BANNER ── */}
        <div className="relative flex items-center rounded-2xl overflow-visible" style={{ minHeight: 120 }}>
          {/* Purple gradient bg (starts after avatar) */}
          <div className="absolute left-[90px] right-0 top-0 bottom-0 rounded-2xl"
            style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #6d28d9 55%, #a855f7 100%)' }} />

          {/* Decorative circles */}
          <div className="absolute right-0 top-0 bottom-0 w-48 rounded-2xl overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
            <div className="absolute bottom-0 right-16 w-24 h-24 rounded-full opacity-10"
              style={{ background: 'radial-gradient(circle, #fff 0%, transparent 70%)' }} />
          </div>

          {/* Avatar – overlaps the purple banner */}
          <div className="relative z-10 flex-shrink-0 ml-4">
            <div className="w-[120px] h-[120px] rounded-full ring-4 ring-white overflow-hidden bg-violet-800 flex items-center justify-center text-white text-3xl font-bold shadow-xl">
              {user?.avatar_url
                ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                : <span>{initials}</span>}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-1 right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-violet-50 transition-colors border border-violet-100"
            >
              {avatarUploading
                ? <div className="w-3.5 h-3.5 border-2 border-violet-400 border-t-violet-700 rounded-full animate-spin" />
                : <Camera size={14} className="text-violet-600" />}
            </button>
          </div>

          {/* Text info */}
          <div className="relative z-10 ml-6 py-6 pr-6 flex-1 min-w-0">
            <p className="text-violet-200 text-sm font-medium mb-0.5">Welcome back,</p>
            <h1 className="text-white font-black text-2xl sm:text-3xl leading-tight uppercase tracking-tight truncate">
              {user?.full_name || user?.user_name}
            </h1>
            <p className="text-violet-300 text-xs mt-1 font-medium uppercase tracking-widest">
              {roleLabel || 'Member'}
            </p>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">

          {/* ── LEFT COLUMN ── */}
          <div className="flex flex-col gap-4">

            {/* Membership card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-5 shadow-sm">
              <p className={`text-3xl font-black ${isPaid ? 'text-green-500' : 'text-red-500'}`}>
                {isPaid ? 'ACTIVE' : 'UNPAID'}
              </p>
              <p className={`text-sm font-semibold uppercase tracking-widest mt-0.5 ${isPaid ? 'text-green-400' : 'text-red-400'}`}>
                Membership
              </p>
              {isPaid && user?.membership_expires_at && (
                <p className="text-xs text-zinc-400 mt-1">
                  Expires: {new Date(user.membership_expires_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
              )}
            </div>

            {/* Avg Score card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-5 shadow-sm">
              <p className="text-3xl font-black text-violet-700 dark:text-violet-400">{avgScore}%</p>
              <p className="text-sm font-semibold uppercase tracking-widest mt-0.5 text-violet-400">Avg. Score</p>
            </div>

            {/* Organization Info card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-5 shadow-sm">
              <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100 mb-4">Organization Info</h3>
              <div className="space-y-3">
                <OrgRow label="Department" value={user?.department} />
                <OrgRow label="Position" value={user?.role_title} capitalize />
                <OrgRow label="Year Joined" value={user?.year_joined} />
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div className="flex flex-col gap-4">

            {/* Personal & Contact Info card */}
            <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-base text-zinc-800 dark:text-zinc-100">Personal & Contact Info</h3>
                <div className="flex items-center gap-2">
                  <UpdatePasswordDialog />
                  <button
                    onClick={openEdit}
                    className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 border border-violet-300 rounded-lg px-3 py-1.5 hover:bg-violet-50 transition-colors"
                  >
                    <Edit3 size={13} />
                    Edit
                  </button>
                </div>
              </div>
              <div className="space-y-2.5">
                <InfoRow label="Username" value={user?.user_name} />
                <InfoRow label="First Name" value={user?.first_name || (user?.full_name ?? '').split(' ')[0]} />
                <InfoRow label="Last Name" value={user?.last_name || (user?.full_name ?? '').split(' ').slice(1).join(' ')} />
                <InfoRow label="Email Address" value={user?.email} />
                <InfoRow label="Contact Number" value={user?.phone ? `${user?.phone_country_code ?? ''} ${user?.phone}`.trim() : undefined} />
                <InfoRow label="Birthday" value={user?.birthday
                  ? new Date(user.birthday + 'T00:00:00').toLocaleDateString('en-US', { year: '2-digit', month: '2-digit', day: '2-digit' })
                  : undefined} />
                <InfoRow label="Home Address" value={user?.home_address} />
                <InfoRow label="School" value={user?.school} />

                <div className="pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800" />
                <h4 className="font-bold text-sm text-zinc-800 dark:text-zinc-100 pt-1">Contact Information</h4>

                <InfoRow label="Contact Person" value={user?.contact_person} />
                <InfoRow label="Relationship to Contact Person" value={user?.contact_person_relationship} />
                <InfoRow label="Contact No." value={user?.contact_person_phone} />
              </div>
            </div>
          </div>
        </div>

        {/* ── BACK BUTTON ── */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm font-semibold text-zinc-500 hover:text-violet-600 transition-colors group"
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
        </div>
      </div>
    </>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm border-b border-zinc-50 dark:border-zinc-800 pb-2 last:border-0 last:pb-0">
      <span className="font-semibold text-zinc-600 dark:text-zinc-400 whitespace-nowrap flex-shrink-0">{label}</span>
      <span className="text-zinc-800 dark:text-zinc-200 text-right">{value || <span className="text-zinc-300 dark:text-zinc-600 italic text-xs">—</span>}</span>
    </div>
  );
}

function OrgRow({ label, value, capitalize }: { label: string; value?: string; capitalize?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-zinc-50 dark:border-zinc-800 pb-2.5 last:border-0 last:pb-0">
      <span className="font-semibold text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className={`text-zinc-800 dark:text-zinc-200 ${capitalize ? 'capitalize' : ''}`}>
        {value || <span className="text-zinc-300 dark:text-zinc-600 italic text-xs">—</span>}
      </span>
    </div>
  );
}

function EditField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={wide ? 'col-span-2' : ''}>
      <label className="block text-xs font-semibold text-zinc-500 mb-1">{label}</label>
      {children}
      <style jsx global>{`
        .profile-input {
          width: 100%;
          font-size: 0.875rem;
          border: 1px solid #e4e4e7;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          background: #fafafa;
          outline: none;
        }
        .profile-input:focus {
          border-color: #a78bfa;
          box-shadow: 0 0 0 2px rgba(167, 139, 250, 0.25);
        }
        .dark .profile-input {
          background: #27272a;
          border-color: #3f3f46;
          color: #f4f4f5;
        }
      `}</style>
    </div>
  );
}
