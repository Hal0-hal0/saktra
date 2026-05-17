'use client';
import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { supabase } from '@/lib/supabase/supabase-client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/sonner';
import {
  User, Mail, Phone, MapPin, Lock, Eye, EyeOff,
  GraduationCap, Calendar, Building2, Shield, UserCheck,
  ChevronRight, ChevronLeft, CheckCircle2, AlertCircle
} from 'lucide-react';

type FormData = {
  full_name: string;
  user_name: string;
  phone: string;
  birthday: string;
  home_address: string;
  school: string;
  department: string;
  role_title: string;
  year_joined: string;
  contact_person: string;
  contact_person_relationship: string;
  contact_person_phone: string;
  new_password: string;
  confirm_password: string;
};

const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Organization', icon: Building2 },
  { id: 3, label: 'Emergency Contact', icon: Shield },
  { id: 4, label: 'Set Password', icon: Lock },
];

export default function AccountSetup() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState<FormData>({
    full_name: '',
    user_name: '',
    phone: '',
    birthday: '',
    home_address: '',
    school: '',
    department: '',
    role_title: '',
    year_joined: new Date().getFullYear().toString(),
    contact_person: '',
    contact_person_relationship: '',
    contact_person_phone: '',
    new_password: '',
    confirm_password: '',
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? '');

      // Pre-fill with existing profile data
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.is_setup_complete) {
        const dest = profile?.role === 'admin' ? '/admin' : profile?.role === 'user' ? '/users' : '/exec';
        router.push(dest);
        return;
      }

      if (profile) {
        setForm(prev => ({
          ...prev,
          full_name: profile.full_name ?? '',
          user_name: profile.user_name ?? '',
          phone: profile.phone ?? '',
          birthday: profile.birthday ?? '',
          home_address: profile.home_address ?? '',
          school: profile.school ?? '',
          department: profile.department ?? '',
          role_title: profile.role_title ?? '',
          year_joined: profile.year_joined ?? new Date().getFullYear().toString(),
          contact_person: profile.contact_person ?? '',
          contact_person_relationship: profile.contact_person_relationship ?? '',
          contact_person_phone: profile.contact_person_phone ?? '',
        }));
      }

      setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (!form.full_name.trim()) { toast.error('Full name is required'); return false; }
      if (!form.user_name.trim()) { toast.error('Username is required'); return false; }
      if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
      if (!form.birthday) { toast.error('Birthday is required'); return false; }
      if (!form.home_address.trim()) { toast.error('Home address is required'); return false; }
      if (!form.school.trim()) { toast.error('School is required'); return false; }
    }
    if (currentStep === 2) {
      if (!form.department.trim()) { toast.error('Department is required'); return false; }
      if (!form.role_title.trim()) { toast.error('Role/Position is required'); return false; }
      if (!form.year_joined) { toast.error('Year joined is required'); return false; }
    }
    if (currentStep === 3) {
      if (!form.contact_person.trim()) { toast.error('Emergency contact name is required'); return false; }
      if (!form.contact_person_relationship.trim()) { toast.error('Relationship is required'); return false; }
      if (!form.contact_person_phone.trim()) { toast.error('Emergency contact number is required'); return false; }
    }
    if (currentStep === 4) {
      if (!form.new_password) { toast.error('Password is required'); return false; }
      if (form.new_password.length < 8) { toast.error('Password must be at least 8 characters'); return false; }
      if (form.new_password !== form.confirm_password) { toast.error('Passwords do not match'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) setCurrentStep(s => s + 1);
  };

  const handleBack = () => setCurrentStep(s => s - 1);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;
    setLoading(true);

    try {
      // Update password
      const { error: passError } = await supabase.auth.updateUser({
        password: form.new_password,
      });
      if (passError) throw new Error(passError.message);

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: form.full_name,
          user_name: form.user_name,
          phone: form.phone,
          birthday: form.birthday,
          home_address: form.home_address,
          school: form.school,
          department: form.department,
          role_title: form.role_title,
          year_joined: form.year_joined,
          contact_person: form.contact_person,
          contact_person_relationship: form.contact_person_relationship,
          contact_person_phone: form.contact_person_phone,
          is_setup_complete: true,
        })
        .eq('user_id', userId);

      if (profileError) throw new Error(profileError.message);

      // Fetch role to redirect correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      toast.success('Account setup complete! Welcome aboard 🎉');

      const dest = profile?.role === 'admin' ? '/admin' : profile?.role === 'user' ? '/users' : '/exec';
      setTimeout(() => router.push(dest), 1500);
    } catch (err: any) {
      toast.error(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-purple-50 dark:from-zinc-950 dark:to-zinc-900">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
          <p className="text-sm text-muted-foreground">Loading your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 flex flex-col items-center justify-center p-4">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-600 mb-4 shadow-lg shadow-violet-200 dark:shadow-violet-900/30">
          <UserCheck className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Account Setup</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">
          Complete your profile before accessing the dashboard
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium px-3 py-1.5 rounded-full">
          <AlertCircle className="w-3.5 h-3.5" />
          All fields are required to proceed
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-0 mb-8 w-full max-w-lg">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentStep > step.id;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isDone
                  ? 'bg-violet-600 border-violet-600 text-white'
                  : isActive
                    ? 'bg-white dark:bg-zinc-800 border-violet-600 text-violet-600'
                    : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  }`}>
                  {isDone ? <CheckCircle2 className="w-4.5 h-4.5" /> : <Icon className="w-4 h-4" />}
                </div>
                <span className={`text-xs mt-1 font-medium hidden sm:block ${isActive ? 'text-violet-600' : isDone ? 'text-violet-500' : 'text-zinc-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 transition-all duration-500 ${isDone ? 'bg-violet-500' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-2xl shadow-xl shadow-zinc-200/80 dark:shadow-zinc-950 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-4">
          <p className="text-white/70 text-xs font-medium uppercase tracking-widest">Step {currentStep} of {STEPS.length}</p>
          <h2 className="text-white text-xl font-bold mt-0.5">{STEPS[currentStep - 1].label}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* ── STEP 1: Personal Info ── */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="Full Name">
                <input name="full_name" value={form.full_name} onChange={handleChange}
                  placeholder="e.g. Juan Dela Cruz"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="Username">
                <input name="user_name" value={form.user_name} onChange={handleChange}
                  placeholder="e.g. juandc"
                  className="field-input" />
              </FieldRow>
              <div className="grid grid-cols-2 gap-4">
                <FieldRow icon={<Phone className="w-4 h-4 text-violet-500" />} label="Phone">
                  <input name="phone" value={form.phone} onChange={handleChange}
                    placeholder="09XXXXXXXXX"
                    className="field-input" />
                </FieldRow>
                <FieldRow icon={<Calendar className="w-4 h-4 text-violet-500" />} label="Birthday">
                  <input name="birthday" type="date" value={form.birthday} onChange={handleChange}
                    className="field-input" />
                </FieldRow>
              </div>
              <FieldRow icon={<MapPin className="w-4 h-4 text-violet-500" />} label="Home Address">
                <input name="home_address" value={form.home_address} onChange={handleChange}
                  placeholder="City, Province, Philippines"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<GraduationCap className="w-4 h-4 text-violet-500" />} label="School / University">
                <input name="school" value={form.school} onChange={handleChange}
                  placeholder="e.g. West Visayas State University"
                  className="field-input" />
              </FieldRow>
              <div className="pt-1">
                <p className="text-xs text-zinc-400 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Logging in as <span className="font-semibold text-violet-500">{userEmail}</span>
                </p>
              </div>
            </div>
          )}

          {/* ── STEP 2: Organization ── */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <FieldRow icon={<Building2 className="w-4 h-4 text-violet-500" />} label="Department">
                <input name="department" value={form.department} onChange={handleChange}
                  placeholder="e.g. Media & Creatives"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<UserCheck className="w-4 h-4 text-violet-500" />} label="Role / Position">
                <input name="role_title" value={form.role_title} onChange={handleChange}
                  placeholder="e.g. Creatives Officer"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<Calendar className="w-4 h-4 text-violet-500" />} label="Year Joined">
                <input name="year_joined" type="number" value={form.year_joined} onChange={handleChange}
                  min="2000" max={new Date().getFullYear()}
                  placeholder={new Date().getFullYear().toString()}
                  className="field-input" />
              </FieldRow>
            </div>
          )}

          {/* ── STEP 3: Emergency Contact ── */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                This person will be contacted in case of an emergency. Please provide accurate information.
              </div>
              <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="Contact Person Name">
                <input name="contact_person" value={form.contact_person} onChange={handleChange}
                  placeholder="Full name of emergency contact"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<Shield className="w-4 h-4 text-violet-500" />} label="Relationship">
                <input name="contact_person_relationship" value={form.contact_person_relationship} onChange={handleChange}
                  placeholder="e.g. Parent, Sibling, Aunt/Uncle"
                  className="field-input" />
              </FieldRow>
              <FieldRow icon={<Phone className="w-4 h-4 text-violet-500" />} label="Contact Number">
                <input name="contact_person_phone" value={form.contact_person_phone} onChange={handleChange}
                  placeholder="09XXXXXXXXX"
                  className="field-input" />
              </FieldRow>
            </div>
          )}

          {/* ── STEP 4: Password ── */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 rounded-xl text-xs text-amber-700 dark:text-amber-300">
                Set a new secure password for your account. You won&apos;t be able to use the temporary one after this.
              </div>
              <FieldRow icon={<Lock className="w-4 h-4 text-violet-500" />} label="New Password">
                <div className="relative flex-1">
                  <input
                    name="new_password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.new_password}
                    onChange={handleChange}
                    placeholder="Min. 8 characters"
                    className="field-input pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-violet-500 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FieldRow>
              <FieldRow icon={<Lock className="w-4 h-4 text-violet-500" />} label="Confirm Password">
                <div className="relative flex-1">
                  <input
                    name="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={handleChange}
                    placeholder="Re-enter password"
                    className="field-input pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-violet-500 transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </FieldRow>
              {form.new_password && form.confirm_password && (
                <div className={`flex items-center gap-1.5 text-xs font-medium ${form.new_password === form.confirm_password ? 'text-green-600' : 'text-red-500'}`}>
                  {form.new_password === form.confirm_password
                    ? <><CheckCircle2 className="w-3.5 h-3.5" /> Passwords match</>
                    : <><AlertCircle className="w-3.5 h-3.5" /> Passwords do not match</>}
                </div>
              )}
              {/* Password strength */}
              {form.new_password && (
                <div className="space-y-1">
                  <p className="text-xs text-zinc-500">Password strength</p>
                  <div className="flex gap-1">
                    {[8, 12, 16].map((len, i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${form.new_password.length >= len
                        ? i === 0 ? 'bg-red-400' : i === 1 ? 'bg-amber-400' : 'bg-green-500'
                        : 'bg-zinc-200 dark:bg-zinc-700'
                        }`} />
                    ))}
                  </div>
                  <p className="text-xs text-zinc-400">
                    {form.new_password.length < 8 ? 'Too short' : form.new_password.length < 12 ? 'Weak' : form.new_password.length < 16 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 gap-3">
            {currentStep > 1 ? (
              <button type="button" onClick={handleBack}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-sm font-medium transition-all">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : <div />}

            {currentStep < STEPS.length ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-md shadow-violet-200 dark:shadow-violet-900/30 transition-all ml-auto">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button type="submit" disabled={loading}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-md shadow-violet-200 dark:shadow-violet-900/30 transition-all ml-auto">
                {loading ? (
                  <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Saving...</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4" /> Complete Setup</>
                )}
              </button>
            )}
          </div>
        </form>
      </div>

      <p className="mt-6 text-xs text-zinc-400">
        You must complete all steps before accessing the dashboard.
      </p>

      <style jsx global>{`
        .field-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1.5px solid #e4e4e7;
          border-radius: 0.625rem;
          font-size: 0.875rem;
          background: transparent;
          color: inherit;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .dark .field-input {
          border-color: #3f3f46;
        }
        .dark .field-input:focus {
          border-color: #7c3aed;
        }
      `}</style>
    </div>
  );
}

function FieldRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
        {icon} {label}
      </label>
      {children}
    </div>
  );
}
