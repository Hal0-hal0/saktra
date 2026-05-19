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
  first_name: string;
  last_name: string;
  user_name: string;
  phone_country_code: string;
  phone: string;
  birthday: string;
  home_address: string;
  school: string;
  contact_person: string;
  contact_person_relationship: string;
  contact_person_phone_country_code: string;
  contact_person_phone: string;
  new_password: string;
  confirm_password: string;
};

// Organization step removed — department / position / year_joined are assigned by
// the BOD via Invite Member and are not user-editable in setup.
const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Emergency Contact', icon: Shield },
  { id: 3, label: 'Set Password', icon: Lock },
];

const COUNTRY_CODES = [
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

const TODAY_ISO = new Date().toISOString().slice(0, 10);

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
    first_name: '',
    last_name: '',
    user_name: '',
    phone_country_code: '+63',
    phone: '',
    birthday: '',
    home_address: '',
    school: '',
    contact_person: '',
    contact_person_relationship: '',
    contact_person_phone_country_code: '+63',
    contact_person_phone: '',
    new_password: '',
    confirm_password: '',
  });
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

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
        // Derive first/last from full_name if those columns are still empty.
        const fallbackFirst = (profile.full_name ?? '').split(' ')[0] ?? '';
        const fallbackLast = (profile.full_name ?? '').includes(' ')
          ? (profile.full_name ?? '').slice(((profile.full_name ?? '').indexOf(' ') + 1))
          : '';
        setForm(prev => ({
          ...prev,
          first_name: profile.first_name || fallbackFirst,
          last_name: profile.last_name || fallbackLast,
          user_name: profile.user_name && profile.user_name !== 'Not Set' ? profile.user_name : '',
          phone_country_code: profile.phone_country_code || '+63',
          phone: profile.phone ?? '',
          birthday: profile.birthday ?? '',
          home_address: profile.home_address ?? '',
          school: profile.school ?? '',
          contact_person: profile.contact_person ?? '',
          contact_person_relationship: profile.contact_person_relationship ?? '',
          contact_person_phone_country_code: '+63',
          contact_person_phone: profile.contact_person_phone ?? '',
        }));
      }

      setCheckingAuth(false);
    };
    checkUser();
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    // Phone fields: digits only.
    if (name === 'phone' || name === 'contact_person_phone') {
      setForm(prev => ({ ...prev, [name]: value.replace(/\D/g, '') }));
      return;
    }
    setForm(prev => ({ ...prev, [name]: value }));
    if (name === 'user_name') setUsernameStatus('idle');
  };

  const checkUsername = async () => {
    const username = form.user_name.trim();
    if (!username) { setUsernameStatus('idle'); return; }
    setUsernameStatus('checking');
    const { data } = await supabase
      .from('profiles')
      .select('user_id')
      .ilike('user_name', username)
      .neq('user_id', userId ?? '')
      .maybeSingle();
    setUsernameStatus(data ? 'taken' : 'available');
  };

  const validateStep = (): boolean => {
    if (currentStep === 1) {
      if (!form.first_name.trim()) { toast.error('First name is required'); return false; }
      if (!form.last_name.trim()) { toast.error('Last name is required'); return false; }
      if (!form.user_name.trim()) { toast.error('Username is required'); return false; }
      if (usernameStatus === 'taken') { toast.error('Username is already taken'); return false; }
      if (!form.phone.trim()) { toast.error('Phone number is required'); return false; }
      if (!/^\d{7,15}$/.test(form.phone)) { toast.error('Phone must be 7–15 digits'); return false; }
      if (!form.birthday) { toast.error('Birthday is required'); return false; }
      if (form.birthday >= TODAY_ISO) { toast.error('Birthday must be in the past'); return false; }
      if (!form.home_address.trim()) { toast.error('Home address is required'); return false; }
      if (!form.school.trim()) { toast.error('School is required'); return false; }
    }
    if (currentStep === 2) {
      if (!form.contact_person.trim()) { toast.error('Emergency contact name is required'); return false; }
      if (!form.contact_person_relationship.trim()) { toast.error('Relationship is required'); return false; }
      if (!form.contact_person_phone.trim()) { toast.error('Emergency contact number is required'); return false; }
      if (!/^\d{7,15}$/.test(form.contact_person_phone)) { toast.error('Contact phone must be 7–15 digits'); return false; }
    }
    if (currentStep === 3) {
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

      // Final uniqueness check (race-safe via the partial unique index).
      const fullName = `${form.first_name.trim()} ${form.last_name.trim()}`.trim();

      // Store phone digits separately from the country code so the profile
      // editor can render each piece on its own.
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          full_name: fullName,
          user_name: form.user_name.trim(),
          phone_country_code: form.phone_country_code,
          phone: form.phone,
          birthday: form.birthday,
          home_address: form.home_address,
          school: form.school,
          contact_person: form.contact_person,
          contact_person_relationship: form.contact_person_relationship,
          contact_person_phone: `${form.contact_person_phone_country_code} ${form.contact_person_phone}`,
          is_setup_complete: true,
        })
        .eq('user_id', userId);

      if (profileError) {
        if (profileError.message?.includes('profiles_user_name_unique')) {
          throw new Error('That username is already taken. Pick another.');
        }
        throw new Error(profileError.message);
      }

      // Fetch role to redirect correctly
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      toast.success('Account setup complete! Welcome aboard');

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
              <div className="grid grid-cols-2 gap-4">
                <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="First Name">
                  <input name="first_name" value={form.first_name} onChange={handleChange}
                    placeholder="Juan"
                    className="field-input" />
                </FieldRow>
                <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="Last Name">
                  <input name="last_name" value={form.last_name} onChange={handleChange}
                    placeholder="Dela Cruz"
                    className="field-input" />
                </FieldRow>
              </div>
              <FieldRow icon={<User className="w-4 h-4 text-violet-500" />} label="Username">
                <input name="user_name" value={form.user_name} onChange={handleChange}
                  onBlur={checkUsername}
                  placeholder="e.g. juandc"
                  className="field-input" />
                {usernameStatus === 'checking' && (
                  <p className="text-xs text-zinc-400 mt-1">Checking availability…</p>
                )}
                {usernameStatus === 'available' && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Username is available
                  </p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Username is already taken
                  </p>
                )}
              </FieldRow>
              <FieldRow icon={<Phone className="w-4 h-4 text-violet-500" />} label="Phone">
                <div className="flex gap-2 items-stretch">
                  <div className='w-30'>
                    <select
                    name="phone_country_code"
                    value={form.phone_country_code}
                    onChange={handleChange}
                    className="field-input w-28 bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                    aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="9171234567"
                    className="field-input flex-1 min-w-0"
                  />
                </div>
                <p className="text-[10px] text-zinc-400 mt-1">Select your country code on the left, then type your number (digits only).</p>
              </FieldRow>
              <FieldRow icon={<Calendar className="w-4 h-4 text-violet-500" />} label="Birthday">
                <input name="birthday" type="date" value={form.birthday} onChange={handleChange}
                  max={TODAY_ISO}
                  className="field-input" />
              </FieldRow>
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

          {/* ── STEP 2: Emergency Contact ── */}
          {currentStep === 2 && (
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
                <div className="flex gap-2 items-stretch">
                  <div className='w-30'>
                    <select
                    name="contact_person_phone_country_code"
                    value={form.contact_person_phone_country_code}
                    onChange={handleChange}
                    className="field-input w-28 bg-zinc-50 dark:bg-zinc-800 cursor-pointer"
                    aria-label="Country code"
                    >
                      {COUNTRY_CODES.map((c) => (
                        <option key={c.code} value={c.code}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <input
                    name="contact_person_phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    value={form.contact_person_phone}
                    onChange={handleChange}
                    placeholder="9171234567"
                    className="field-input flex-1 min-w-0"
                  />
                </div>
              </FieldRow>
            </div>
          )}

          {/* ── STEP 3: Password ── */}
          {currentStep === 3 && (
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
          background: #ffffff;
          color: #18181b;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .field-input::placeholder {
          color: #a1a1aa;
        }
        select.field-input {
          appearance: auto;
        }
        select.field-input option {
          background: #ffffff;
          color: #18181b;
        }
        .field-input:focus {
          border-color: #7c3aed;
          box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.12);
        }
        .dark .field-input {
          background: #18181b;
          color: #f4f4f5;
          border-color: #3f3f46;
        }
        .dark .field-input::placeholder {
          color: #71717a;
        }
        .dark select.field-input option {
          background: #18181b;
          color: #f4f4f5;
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
