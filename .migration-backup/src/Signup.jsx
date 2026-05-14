import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { localDb } from './localDbClient';
import myLogo from './assets/logo.png';
import Toast from './Toast';
import { useResponsive } from './useResponsive';
import { FaCheck, FaEye, FaEyeSlash } from 'react-icons/fa';

// ── Constants ────────────────────────────────────────────────────────────────
const LRN_PATTERN    = /^\d{12}$/;
const PHONE_PATTERN  = /^\d{11}$/;
const NAME_MIN = 2;
const NAME_MAX = 40;

const GRADE_OPTIONS    = ['Grade 11', 'Grade 12'];
const DEFAULT_STRANDS  = [
  'STEM', 'HUMSS', 'ABM', 'GAS',
  'TVL - Industrial Arts', 'TVL - Home Economics',
  'TVL - ICT', 'TVL - Agri-Fishery Arts',
  'Sports', 'Arts & Design',
];

// ── SVG icons ────────────────────────────────────────────────────────────────
const Ico = {
  user: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  briefcase: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>,
  lock: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  mail: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,
  id: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="8" y1="10" x2="16" y2="10"/><line x1="8" y1="14" x2="14" y2="14"/></svg>,
  book: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  tag: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>,
  phone: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.38 2 2 0 0 1 3.58 1h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91A16 16 0 0 0 15 16.91l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>,
  chevronDown: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>,
  layers: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  person: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildFullName = (first, mi, last) => {
  const parts = [first.trim()];
  if (mi.trim()) parts.push(`${mi.trim().charAt(0).toUpperCase()}.`);
  parts.push(last.trim());
  return parts.join(' ');
};
const sanitize = (str) => str.replace(/<[^>]*>/g, '').trim();

// ── Step metadata ────────────────────────────────────────────────────────────
const STEPS = [
  { label: 'Account',  desc: 'Set up login credentials'    },
  { label: 'Personal', desc: 'Tell us your name'            },
  { label: 'Details',  desc: 'ID & contact information'     },
  { label: 'Education',desc: 'Grade, section & adviser'     },
];

// ── Main ─────────────────────────────────────────────────────────────────────
export default function Signup() {
  const navigate = useNavigate();
  const { isMobile, isTablet } = useResponsive();

  const [step,   setStep]   = useState(1);
  const [role,   setRole]   = useState('student');
  const [loading, setLoading] = useState(false);
  const [toast,  setToast]  = useState({ message: '', type: 'success' });
  const [strands, setStrands] = useState(DEFAULT_STRANDS);
  // null = unchecked, false = no walk-in profile, object = walk-in profile found
  const [claimProfile, setClaimProfile] = useState(null);

  const showToast = (msg, type = 'success') => setToast({ message: msg, type });

  const [sd, setSd] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', middleInitial: '',
    lrn: '', contactNumber: '',
    grade: '', strand: '', section: '', adviser: '',
  });

  const [td, setTd] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', middleInitial: '',
    employeeId: '', contactNumber: '',
    position: '', gradeSection: '', adviser: '',
  });

  useEffect(() => {
    localDb.from('site_content').select('strands').limit(1).maybeSingle()
      .then(({ data }) => {
        if (data?.strands) {
          try {
            const arr = JSON.parse(data.strands);
            if (Array.isArray(arr) && arr.length) setStrands(arr);
          } catch { /* keep default */ }
        }
      });
  }, []);

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = () => {
    if (role === 'student') {
      if (step === 1) {
        if (!sd.email)              { showToast('Email is required.', 'warning'); return false; }
        if (sd.password.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return false; }
        if (!sd.confirmPassword)    { showToast('Please confirm your password.', 'warning'); return false; }
        if (sd.password !== sd.confirmPassword) { showToast('Passwords do not match.', 'error'); return false; }
      }
      if (step === 2) {
        if (sanitize(sd.firstName).length < NAME_MIN)  { showToast('First name must be at least 2 characters.', 'warning'); return false; }
        if (!/[a-zA-Z]/.test(sd.firstName))            { showToast('First name must contain letters.', 'warning'); return false; }
        if (sanitize(sd.lastName).length  < NAME_MIN)  { showToast('Last name must be at least 2 characters.', 'warning'); return false; }
        if (!/[a-zA-Z]/.test(sd.lastName))             { showToast('Last name must contain letters.', 'warning'); return false; }
        const mi = sanitize(sd.middleInitial);
        if (mi && !/^[a-zA-Z]$/.test(mi)) { showToast('Middle initial must be a single letter.', 'warning'); return false; }
      }
      if (step === 3) {
        if (!LRN_PATTERN.test(sanitize(sd.lrn)))       { showToast('LRN must be exactly 12 digits.', 'warning'); return false; }
        if (!sd.contactNumber)                          { showToast('Contact number is required.', 'warning'); return false; }
        if (!PHONE_PATTERN.test(sd.contactNumber))     { showToast('Contact number must be exactly 11 digits (e.g. 09171234567).', 'warning'); return false; }
      }
      if (step === 4) {
        if (!sd.grade)                                  { showToast('Please select a grade level.', 'warning'); return false; }
        if (!sd.strand)                                 { showToast('Please select a strand.', 'warning'); return false; }
        if (!sanitize(sd.section))                      { showToast('Section is required.', 'warning'); return false; }
        if (!sanitize(sd.adviser))                      { showToast('Adviser name is required.', 'warning'); return false; }
      }
    } else {
      if (step === 1) {
        if (!td.email)              { showToast('Email is required.', 'warning'); return false; }
        if (td.password.length < 6) { showToast('Password must be at least 6 characters.', 'warning'); return false; }
        if (!td.confirmPassword)    { showToast('Please confirm your password.', 'warning'); return false; }
        if (td.password !== td.confirmPassword) { showToast('Passwords do not match.', 'error'); return false; }
      }
      if (step === 2) {
        if (sanitize(td.firstName).length < NAME_MIN)  { showToast('First name must be at least 2 characters.', 'warning'); return false; }
        if (!/[a-zA-Z]/.test(td.firstName))            { showToast('First name must contain letters.', 'warning'); return false; }
        if (sanitize(td.lastName).length  < NAME_MIN)  { showToast('Last name must be at least 2 characters.', 'warning'); return false; }
        if (!/[a-zA-Z]/.test(td.lastName))             { showToast('Last name must contain letters.', 'warning'); return false; }
        const mi = sanitize(td.middleInitial);
        if (mi && !/^[a-zA-Z]$/.test(mi)) { showToast('Middle initial must be a single letter.', 'warning'); return false; }
      }
      if (step === 3) {
        if (!sanitize(td.employeeId))                  { showToast('Employee ID is required.', 'warning'); return false; }
        if (!/^\d{7}$/.test(sanitize(td.employeeId))) { showToast('Employee ID must be exactly 7 digits (e.g. 1435418).', 'warning'); return false; }
        if (!td.contactNumber)                          { showToast('Contact number is required.', 'warning'); return false; }
        if (!PHONE_PATTERN.test(td.contactNumber))     { showToast('Contact number must be exactly 11 digits (e.g. 09171234567).', 'warning'); return false; }
      }
      if (step === 4) {
        if (!sanitize(td.position))                    { showToast('Position is required.', 'warning'); return false; }
        if (!sanitize(td.gradeSection))                { showToast('Track / Strand is required.', 'warning'); return false; }
      }
    }
    return true;
  };

  const handleNext = () => { if (validate()) setStep(s => s + 1); };
  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else if (window.history.length > 1) navigate(-1);
    else navigate('/');
  };

  // Check if a walk-in profile exists when LRN / Employee ID is entered
  const checkWalkInProfile = async (idValue, field) => {
    if (!idValue) { setClaimProfile(null); return; }
    let query = localDb.from('users')
      .select('id, auth_id, name, grade_section')
      .eq(field, idValue);
    if (field === 'student_id') query = query.eq('role', 'teacher');
    const { data } = await query.maybeSingle();
    if (data && !data.auth_id) setClaimProfile(data);
    else setClaimProfile(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (role === 'student') {
        const name     = buildFullName(sd.firstName, sd.middleInitial, sd.lastName);
        const lrn      = sanitize(sd.lrn);
        const combined = [sd.grade, sd.strand, sanitize(sd.section)].filter(Boolean).join(' - ');
        const email    = sanitize(sd.email).toLowerCase();

        // Check if a walk-in pre-created profile exists (no auth_id yet)
        const { data: existingProfile } = await localDb.from('users')
          .select('id, auth_id').eq('lrn', lrn).maybeSingle();

        if (existingProfile) {
          // Profile exists AND already has credentials → fully registered, can't claim
          if (existingProfile.auth_id) {
            showToast('This LRN is already registered. Please sign in instead.', 'error');
            return;
          }
          // Walk-in profile found (no auth_id) → claim it: create auth user, link, update profile
          const { data: authData, error: authErr } = await localDb.auth.signUp({ email, password: sd.password });
          if (authErr) throw authErr;
          const authUser = authData?.user;
          if (!authUser) throw new Error('Signup failed unexpectedly.');

          const { error: updateErr } = await localDb.from('users').update({
            auth_id:        authUser.id,
            name,
            grade_section:  combined,
            course_year:    combined,
            section:        sanitize(sd.section),
            contact_number: sanitize(sd.contactNumber),
            adviser:        sanitize(sd.adviser),
            status:         'active',
          }).eq('id', existingProfile.id);
          if (updateErr) throw updateErr;

          showToast('Account claimed! Your borrow history is ready. Check your email to confirm, then sign in.', 'success');
          setTimeout(() => navigate('/login'), 2500);
          return;
        }

        // No existing profile → normal fresh signup
        const { data: authData, error: authErr } = await localDb.auth.signUp({ email, password: sd.password });
        if (authErr) throw authErr;
        const authUser = authData?.user;
        if (!authUser) throw new Error('Signup failed unexpectedly.');

        const { error: profileErr } = await localDb.from('users').insert([{
          auth_id:        authUser.id,
          name,
          student_id:     lrn,
          lrn,
          grade_section:  combined,
          course_year:    combined,
          section:        sanitize(sd.section),
          contact_number: sanitize(sd.contactNumber),
          adviser:        sanitize(sd.adviser),
          role:           'student',
          status:         'active',
        }]);
        if (profileErr) {
          if (profileErr.code === '23505') throw new Error('This LRN is already registered.');
          throw profileErr;
        }

      } else {
        const name       = buildFullName(td.firstName, td.middleInitial, td.lastName);
        const employeeId = sanitize(td.employeeId);
        const email      = sanitize(td.email).toLowerCase();

        // Check if a walk-in pre-created profile exists (no auth_id yet)
        const { data: existingProfile } = await localDb.from('users')
          .select('id, auth_id').eq('student_id', employeeId).eq('role', 'teacher').maybeSingle();

        if (existingProfile) {
          if (existingProfile.auth_id) {
            showToast('This Employee ID is already registered. Please sign in instead.', 'error');
            return;
          }
          // Walk-in profile found → claim it
          const { data: authData, error: authErr } = await localDb.auth.signUp({ email, password: td.password });
          if (authErr) throw authErr;
          const authUser = authData?.user;
          if (!authUser) throw new Error('Signup failed unexpectedly.');

          const { error: updateErr } = await localDb.from('users').update({
            auth_id:        authUser.id,
            name,
            grade_section:  sanitize(td.gradeSection),
            position:       sanitize(td.position),
            course_year:    sanitize(td.position),
            contact_number: sanitize(td.contactNumber),
            status:         'active',
          }).eq('id', existingProfile.id);
          if (updateErr) throw updateErr;

          showToast('Account claimed! Your borrow history is ready. Check your email to confirm, then sign in.', 'success');
          setTimeout(() => navigate('/login'), 2500);
          return;
        }

        // No existing profile → normal fresh signup
        const { data: authData, error: authErr } = await localDb.auth.signUp({ email, password: td.password });
        if (authErr) throw authErr;
        const authUser = authData?.user;
        if (!authUser) throw new Error('Signup failed unexpectedly.');

        const { error: profileErr } = await localDb.from('users').insert([{
          auth_id:        authUser.id,
          name,
          student_id:     employeeId,
          grade_section:  sanitize(td.gradeSection),
          position:       sanitize(td.position),
          course_year:    sanitize(td.position),
          contact_number: sanitize(td.contactNumber),
          role:           'teacher',
          status:         'active',
        }]);
        if (profileErr) {
          if (profileErr.code === '23505') throw new Error('This Employee ID is already registered.');
          throw profileErr;
        }
      }

      showToast('Account created! Check your email to confirm, then sign in.', 'success');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showToast('Error: ' + (err.message || 'Could not create account.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Field renderers ──────────────────────────────────────────────────────
  const handleSd = (e) => setSd(p => ({ ...p, [e.target.name]: e.target.value }));
  const handleTd = (e) => setTd(p => ({ ...p, [e.target.name]: e.target.value }));

  const nameFields = (data, handler) => (
    <>
      <div className="su-row">
        <Field icon={Ico.user} label="First Name" name="firstName" placeholder="Juan"
          value={data.firstName} onChange={handler} required maxLength={NAME_MAX} />
        <Field icon={Ico.user} label="Last Name" name="lastName" placeholder="Dela Cruz"
          value={data.lastName} onChange={handler} required maxLength={NAME_MAX} />
      </div>
      <Field icon={Ico.user} label="Middle Initial" name="middleInitial"
        hint="optional" placeholder="e.g. B"
        value={data.middleInitial}
        onChange={(e) => {
          const val = e.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 1).toUpperCase();
          handler({ target: { name: 'middleInitial', value: val } });
        }}
        maxLength={1} style={{ maxWidth: 140 }} />
    </>
  );

  const renderStep = () => {
    if (role === 'student') {
      if (step === 1) return <>
        <Field icon={Ico.mail} label="Email Address" name="email" type="email"
          placeholder="student@email.com" value={sd.email} onChange={handleSd} required />
        <Field icon={Ico.lock} label="Password" name="password" type="password"
          placeholder="Min. 6 characters" value={sd.password} onChange={handleSd} required />
        <Field icon={Ico.lock} label="Confirm Password" name="confirmPassword" type="password"
          placeholder="Re-enter your password" value={sd.confirmPassword} onChange={handleSd} required
          matchOk={sd.confirmPassword.length > 0 && sd.password === sd.confirmPassword}
          matchFail={sd.confirmPassword.length > 0 && sd.password !== sd.confirmPassword} />
      </>;
      if (step === 2) return nameFields(sd, handleSd);
      if (step === 3) return <>
        <Field icon={Ico.id} label="LRN (12 Digits)" name="lrn"
          placeholder="123456789012" inputMode="numeric" maxLength={12}
          value={sd.lrn}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 12);
            setSd(p => ({ ...p, lrn: v }));
            if (v.length === 12) checkWalkInProfile(v, 'lrn');
            else setClaimProfile(null);
          }}
          required />
        {claimProfile && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:'12px', padding:'12px 14px', fontSize:'.82rem', color:'#1d4ed8' }}>
            <span style={{ fontSize:'1.1rem', flexShrink:0 }}>🔗</span>
            <div>
              <div style={{ fontWeight:700, marginBottom:'2px' }}>Walk-in profile found!</div>
              <div style={{ color:'#3b82f6' }}>A profile for <strong>{claimProfile.name || 'this LRN'}</strong> was created by the librarian. Completing signup will link your email and password to that account — your borrow history will be preserved.</div>
            </div>
          </div>
        )}
        <Field icon={Ico.phone} label="Contact Number" name="contactNumber"
          placeholder="e.g. 09171234567" type="tel" maxLength={11} inputMode="numeric"
          value={sd.contactNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); handleSd({ target: { name: 'contactNumber', value: v } }); }} required />
      </>;
      if (step === 4) return <>
        <div className="su-row">
          <SelectField icon={Ico.book} label="Grade Level" name="grade"
            value={sd.grade} onChange={handleSd} required>
            <option value="">Select Grade</option>
            {GRADE_OPTIONS.map(g => <option key={g} value={g}>{g}</option>)}
          </SelectField>
          <SelectField icon={Ico.layers} label="Strand / Track" name="strand"
            value={sd.strand} onChange={handleSd} required>
            <option value="">Select Strand</option>
            {strands.map(st => <option key={st} value={st}>{st}</option>)}
          </SelectField>
        </div>
        <Field icon={Ico.tag} label="Section" name="section"
          placeholder="e.g. Rizal, Section A" value={sd.section} onChange={handleSd}
          required maxLength={50} />
        <Field icon={Ico.person} label="Adviser" name="adviser"
          placeholder="e.g. Mr. Juan Santos" value={sd.adviser} onChange={handleSd}
          required maxLength={80} />
      </>;
    } else {
      if (step === 1) return <>
        <Field icon={Ico.mail} label="Account Email" name="email" type="email"
          placeholder="teacher@email.com" value={td.email} onChange={handleTd} required />
        <Field icon={Ico.lock} label="Password" name="password" type="password"
          placeholder="Min. 6 characters" value={td.password} onChange={handleTd} required />
        <Field icon={Ico.lock} label="Confirm Password" name="confirmPassword" type="password"
          placeholder="Re-enter your password" value={td.confirmPassword} onChange={handleTd} required
          matchOk={td.confirmPassword.length > 0 && td.password === td.confirmPassword}
          matchFail={td.confirmPassword.length > 0 && td.password !== td.confirmPassword} />
      </>;
      if (step === 2) return nameFields(td, handleTd);
      if (step === 3) return <>
        <Field icon={Ico.id} label="Employee ID" name="employeeId"
          placeholder="e.g. 1435418" value={td.employeeId} onChange={(e) => {
            const v = e.target.value.replace(/\D/g, '').slice(0, 7);
            setTd(p => ({ ...p, employeeId: v }));
            if (v.trim()) checkWalkInProfile(v.trim(), 'student_id');
            else setClaimProfile(null);
          }}
          required maxLength={7} inputMode="numeric" />
        {claimProfile && (
          <div style={{ display:'flex', alignItems:'flex-start', gap:'10px', background:'#eff6ff', border:'1.5px solid #bfdbfe', borderRadius:'12px', padding:'12px 14px', fontSize:'.82rem', color:'#1d4ed8' }}>
            <span style={{ fontSize:'1.1rem', flexShrink:0 }}>🔗</span>
            <div>
              <div style={{ fontWeight:700, marginBottom:'2px' }}>Walk-in profile found!</div>
              <div style={{ color:'#3b82f6' }}>A profile for <strong>{claimProfile.name || 'this Employee ID'}</strong> was created by the librarian. Completing signup will link your email and password to that account — your borrow history will be preserved.</div>
            </div>
          </div>
        )}
        <Field icon={Ico.phone} label="Contact Number" name="contactNumber"
          placeholder="e.g. 09171234567" type="tel" maxLength={11} inputMode="numeric"
          value={td.contactNumber} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 11); handleTd({ target: { name: 'contactNumber', value: v } }); }} required />
      </>;
      if (step === 4) return <>
        <Field icon={Ico.briefcase} label="Position / Designation" name="position"
          placeholder="e.g. Teacher I" value={td.position} onChange={handleTd}
          required maxLength={80} />
        <SelectField icon={Ico.layers} label="Track / Strand" name="gradeSection"
          value={td.gradeSection} onChange={handleTd} required>
          <option value="">Select Strand</option>
          {strands.map(st => <option key={st} value={st}>{st}</option>)}
        </SelectField>
        <Field icon={Ico.person} label="Adviser / Department Head" name="adviser"
          placeholder="e.g. Dr. Maria Reyes" value={td.adviser} onChange={handleTd}
          maxLength={80} hint="optional" />
      </>;
    }
  };

  const isLastStep = step === 4;
  const compact    = isMobile || isTablet;

  return (
    <div className="su-root">
      <style>{`
        *, *::before, *::after { box-sizing: border-box; }

        .su-root {
          display: flex;
          min-height: 100vh;
          background: var(--cream, #f8f5f0);
          font-family: 'DM Sans', system-ui, sans-serif;
        }

        /* ── Left panel ── */
        .su-left {
          width: 420px;
          flex-shrink: 0;
          background: linear-gradient(155deg, #5a1515 0%, #7B1F1F 50%, #8b2020 100%);
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 60px 48px;
          overflow: hidden;
        }
        .su-left::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            radial-gradient(circle at 15% 85%, rgba(255,255,255,.07) 0%, transparent 50%),
            radial-gradient(circle at 85% 15%, rgba(255,255,255,.05) 0%, transparent 45%),
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: auto, auto, 36px 36px, 36px 36px;
          pointer-events: none;
        }
        .su-left-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 48px; position: relative;
        }
        .su-left-logo img { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; }
        .su-left-logo span {
          font-size: 1.4rem; font-weight: 800; color: white; letter-spacing: -.02em;
        }
        .su-left h1 {
          font-size: 2.4rem; font-weight: 800; color: white; line-height: 1.1;
          letter-spacing: -.03em; margin: 0 0 16px; position: relative;
        }
        .su-left p {
          color: rgba(255,255,255,.72); font-size: .95rem; line-height: 1.7;
          margin: 0 0 40px; position: relative;
        }
        .su-features { display: flex; flex-direction: column; gap: 14px; position: relative; }
        .su-feature  {
          display: flex; align-items: center; gap: 12px;
          color: rgba(255,255,255,.82); font-size: .9rem;
        }
        .su-check {
          width: 26px; height: 26px; border-radius: 50%;
          background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.2);
          display: flex; align-items: center; justify-content: center;
          color: #f6c343; font-size: .7rem; flex-shrink: 0;
        }

        /* ── Right panel ── */
        .su-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-start;
          overflow-y: auto;
          padding: 48px 24px 60px;
        }

        /* Mobile hero banner */
        .su-mobile-banner {
          width: 100%;
          background: linear-gradient(155deg, #5a1515 0%, #7B1F1F 60%);
          padding: 40px 24px 36px;
          text-align: center;
          color: white;
          position: relative;
          overflow: hidden;
        }
        .su-mobile-banner::before {
          content: '';
          position: absolute; inset: 0;
          background: radial-gradient(circle at 80% 20%, rgba(255,255,255,.08), transparent 60%);
          pointer-events: none;
        }
        .su-mobile-banner img { width: 52px; height: 52px; border-radius: 12px; margin-bottom: 14px; }
        .su-mobile-banner h1 { font-size: 1.8rem; font-weight: 800; margin: 0 0 6px; letter-spacing: -.02em; }
        .su-mobile-banner p  { font-size: .88rem; color: rgba(255,255,255,.75); margin: 0; }

        /* ── Card ── */
        .su-card {
          width: 100%;
          max-width: 520px;
          background: white;
          border-radius: 22px;
          padding: 36px 32px;
          box-shadow: 0 8px 48px rgba(90,21,21,.09), 0 2px 8px rgba(0,0,0,0.04);
        }
        @media (max-width: 600px) {
          .su-card {
            border-radius: 18px;
            padding: 24px 18px;
            box-shadow: 0 4px 24px rgba(90,21,21,.08);
          }
        }

        .su-card-title {
          font-size: 1.55rem; font-weight: 800; color: #0f172a;
          letter-spacing: -.02em; margin: 0 0 4px;
        }
        .su-card-sub {
          font-size: .85rem; color: #64748b; margin: 0 0 26px;
        }

        /* ── Step bar ── */
        .su-steps {
          display: flex; align-items: center;
          margin-bottom: 26px; gap: 0;
        }
        .su-step-item {
          display: flex; flex-direction: column; align-items: center; gap: 5px; flex-shrink: 0;
        }
        .su-step-bubble {
          width: 34px; height: 34px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: .78rem; font-weight: 800; transition: all .25s;
        }
        .su-step-bubble.done   { background: #7B1F1F; color: white; }
        .su-step-bubble.active { background: #7B1F1F; color: white; box-shadow: 0 0 0 4px rgba(123,31,31,.18); }
        .su-step-bubble.idle   { background: #e2e8f0; color: #94a3b8; }
        .su-step-lbl {
          font-size: .58rem; font-weight: 700; letter-spacing: .07em;
          text-transform: uppercase; white-space: nowrap;
          transition: color .25s;
        }
        .su-step-line {
          flex: 1; height: 2px; margin: 0 3px 18px; transition: background .25s;
        }

        /* ── Role toggle ── */
        .su-role-wrap {
          background: #f1f5f9; border-radius: 12px; padding: 4px;
          display: flex; gap: 6px; margin-bottom: 20px;
        }
        .su-role-btn {
          flex: 1; padding: 10px 8px; border-radius: 9px; border: none; cursor: pointer;
          font-weight: 700; font-size: .87rem; transition: all .2s;
          display: flex; align-items: center; justify-content: center; gap: 7px;
        }
        .su-role-btn.active   { background: #7B1F1F; color: white; box-shadow: 0 2px 10px rgba(123,31,31,.28); }
        .su-role-btn.inactive { background: transparent; color: #64748b; }

        /* ── Section label ── */
        .su-sec-label {
          font-size: .7rem; font-weight: 700; letter-spacing: .09em;
          color: #94a3b8; text-transform: uppercase; margin: 4px 0 14px;
        }

        /* ── Field ── */
        .su-field   { display: flex; flex-direction: column; gap: 6px; }
        .su-label   { font-size: .8rem; font-weight: 600; color: #475569; display: flex; align-items: center; gap: 6px; }
        .su-hint    { color: #94a3b8; font-weight: 400; font-size: .72rem; }
        .su-input-wrap { position: relative; }
        .su-input-ico  {
          position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; display: flex; align-items: center;
        }
        .su-input {
          width: 100%; padding: 12px 14px 12px 40px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: .9rem; background: #f8fafc; color: #1e293b;
          outline: none; transition: border-color .2s, background .2s, box-shadow .2s;
          font-family: inherit;
        }
        .su-input:focus {
          border-color: #7B1F1F;
          background: white;
          box-shadow: 0 0 0 3px rgba(123,31,31,.1);
        }
        .su-input::placeholder { color: #c0c9d4; }
        .su-select-wrap { position: relative; }
        .su-select-chevron {
          position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
          color: #94a3b8; pointer-events: none; display: flex; align-items: center;
        }

        /* ── Two-column row for paired fields ── */
        .su-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        @media (max-width: 480px) {
          .su-row { grid-template-columns: 1fr; }
        }

        /* ── Buttons ── */
        .su-btn-row { display: flex; gap: 10px; margin-top: 22px; }
        .su-btn-back {
          flex: 1; padding: 13px; border-radius: 11px;
          border: 1.5px solid #e2e8f0; background: white; color: #475569;
          font-weight: 700; font-size: .9rem; cursor: pointer;
          transition: all .2s; font-family: inherit;
        }
        .su-btn-back:hover { border-color: #cbd5e1; background: #f8fafc; }
        .su-btn-next {
          flex: 2; padding: 13px; border-radius: 11px; border: none;
          background: #7B1F1F; color: white;
          font-weight: 700; font-size: .9rem; cursor: pointer;
          transition: opacity .2s, transform .15s; font-family: inherit;
          box-shadow: 0 3px 12px rgba(123,31,31,.32);
          letter-spacing: .015em;
        }
        .su-btn-next:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); }
        .su-btn-next:disabled { opacity: .65; cursor: not-allowed; }

        .su-switch {
          text-align: center; margin-top: 18px;
          font-size: .85rem; color: #64748b;
        }
        .su-switch a { color: #7B1F1F; font-weight: 700; text-decoration: none; }
        .su-switch a:hover { text-decoration: underline; }

        /* ── Responsive layout ── */
        @media (max-width: 860px) {
          .su-left { display: none; }
          .su-right { padding: 0 0 48px; }
        }
        @media (min-width: 861px) {
          .su-mobile-banner { display: none; }
          .su-right { padding: 48px 32px 60px; }
        }
      `}</style>

      <Toast {...toast} onClose={() => setToast({ message: '' })} />

      {/* ── Left panel (desktop only) ── */}
      <aside className="su-left">
        <div className="su-left-logo">
          <img src={myLogo} alt="Logo" />
          <span>ShelfMaster</span>
        </div>
        <h1>Join the<br />Library.</h1>
        <p>Create your account and start exploring our entire collection — borrow, reserve, and track your reads.</p>
        <div className="su-features">
          {['Access thousands of titles', 'Real-time availability checks', 'Automated due-date reminders'].map((f, i) => (
            <div className="su-feature" key={i}>
              <div className="su-check"><FaCheck /></div>
              {f}
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right panel ── */}
      <main className="su-right">

        {/* Mobile banner */}
        <div className="su-mobile-banner">
          <img src={myLogo} alt="Logo" />
          <h1>Join ShelfMaster</h1>
          <p>Create your account to get started</p>
        </div>

        <div className="su-card" style={{ marginTop: compact ? 24 : 0 }}>
          <div className="su-card-title">Sign up</div>
          <div className="su-card-sub">Create your free ShelfMaster account.</div>

          {/* ── Step indicator ── */}
          <div className="su-steps">
            {STEPS.map((s, i) => {
              const n      = i + 1;
              const isDone = n < step;
              const isAct  = n === step;
              return (
                <React.Fragment key={n}>
                  <div className="su-step-item">
                    <div className={`su-step-bubble ${isDone ? 'done' : isAct ? 'active' : 'idle'}`}>
                      {isDone
                        ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        : n}
                    </div>
                    {/* Hide step labels on very small screens */}
                    <span className="su-step-lbl" style={{ color: (isDone || isAct) ? '#7B1F1F' : '#94a3b8', display: compact ? 'none' : 'block' }}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className="su-step-line" style={{ background: isDone ? '#7B1F1F' : '#e2e8f0' }} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Current step name on mobile */}
          {compact && (
            <div style={{ textAlign: 'center', marginBottom: 18 }}>
              <span style={{ fontSize: '.68rem', fontWeight: 700, letterSpacing: '.08em', color: '#7B1F1F', textTransform: 'uppercase' }}>
                Step {step} of 4 — {STEPS[step - 1].label}
              </span>
              <div style={{ fontSize: '.78rem', color: '#94a3b8', marginTop: 2 }}>{STEPS[step - 1].desc}</div>
            </div>
          )}

          {/* Role toggle (step 1 only) */}
          {step === 1 && (
            <>
              <div className="su-sec-label">Account Type</div>
              <div className="su-role-wrap">
                <button className={`su-role-btn ${role === 'student' ? 'active' : 'inactive'}`}
                  type="button" onClick={() => setRole('student')}>
                  {Ico.user} Student
                </button>
                <button className={`su-role-btn ${role === 'teacher' ? 'active' : 'inactive'}`}
                  type="button" onClick={() => setRole('teacher')}>
                  {Ico.briefcase} Teacher
                </button>
              </div>
            </>
          )}

          {/* Section label for steps 2+ */}
          {step > 1 && !compact && (
            <div className="su-sec-label">{STEPS[step - 1].desc}</div>
          )}

          {/* Fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {renderStep()}
          </div>

          {/* Navigation */}
          <div className="su-btn-row">
            <button className="su-btn-back" type="button" onClick={handleBack}>
              ← Back
            </button>
            {isLastStep ? (
              <button className="su-btn-next" type="button" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Creating account…' : 'Complete Sign up ✓'}
              </button>
            ) : (
              <button className="su-btn-next" type="button" onClick={handleNext}>
                Continue →
              </button>
            )}
          </div>

          <div className="su-switch">
            Already have an account? <Link to="/login">Sign In</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Reusable Field ────────────────────────────────────────────────────────────
function Field({ icon, label, hint, style: extraStyle, matchOk, matchFail, ...props }) {
  const isPassword = props.type === 'password';
  const [showPw, setShowPw] = React.useState(false);
  const inputType = isPassword ? (showPw ? 'text' : 'password') : props.type;

  const borderColor = matchOk ? '#16a34a' : matchFail ? '#dc2626' : undefined;
  const boxShadow   = matchOk ? '0 0 0 3px rgba(22,163,74,.12)' : matchFail ? '0 0 0 3px rgba(220,38,38,.10)' : undefined;

  return (
    <div className="su-field">
      <label className="su-label">
        {label}
        {hint && <span className="su-hint"> — {hint}</span>}
      </label>
      <div className="su-input-wrap" style={{ position: 'relative' }}>
        <span className="su-input-ico">{icon}</span>
        <input
          className="su-input"
          style={{
            ...extraStyle,
            paddingRight: isPassword ? 40 : undefined,
            ...(borderColor ? { borderColor, boxShadow } : {}),
          }}
          {...props}
          type={inputType}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(p => !p)}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', display: 'flex', alignItems: 'center', padding: 0,
            }}
            tabIndex={-1}
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? <FaEyeSlash size={15} /> : <FaEye size={15} />}
          </button>
        )}
      </div>
      {matchOk && (
        <span style={{ fontSize: '.75rem', color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
          ✓ Passwords match
        </span>
      )}
      {matchFail && (
        <span style={{ fontSize: '.75rem', color: '#dc2626', fontWeight: 600, marginTop: 2 }}>
          Passwords do not match
        </span>
      )}
    </div>
  );
}

// ── Reusable Select ───────────────────────────────────────────────────────────
function SelectField({ icon, label, children, ...props }) {
  return (
    <div className="su-field">
      <label className="su-label">{label}</label>
      <div className="su-select-wrap su-input-wrap">
        <span className="su-input-ico">{icon}</span>
        <select className="su-input" style={{ appearance: 'none', cursor: 'pointer', paddingRight: 36 }} {...props}>
          {children}
        </select>
        <span className="su-select-chevron">{Ico.chevronDown}</span>
      </div>
    </div>
  );
}