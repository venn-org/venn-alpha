/**
 * Firebase Auth helpers + phone-OTP spam protection.
 *
 * Every auth operation goes through Firebase; the Supabase client then
 * passes the Firebase JWT via its `accessToken` callback so RLS works.
 */
import { Platform } from 'react-native';
import {
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from './firebase';
import { supabase } from './supabase';

// ---------------------------------------------------------------------------
// Phone OTP spam protection
// ---------------------------------------------------------------------------

const PHONE_KEY = 'venn_phone_attempts';
const MAX_DAILY_ATTEMPTS = 5; // per phone number per day
const COOLDOWN_MS = 60_000; // 60s between requests

/** Read persisted phone attempt map from storage. */
function readAttempts() {
  try {
    const raw = typeof localStorage !== 'undefined'
      ? localStorage.getItem(PHONE_KEY)
      : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

/** Persist phone attempt map to storage. */
function writeAttempts(map) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PHONE_KEY, JSON.stringify(map));
    }
  } catch { /* storage unavailable */ }
}

/**
 * Check whether we're allowed to send another OTP to `phone`.
 * Returns `{ allowed: true }` or `{ allowed: false, reason: string }`.
 */
export function canSendPhoneOtp(phone) {
  const map = readAttempts();
  const today = new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
  const entry = map[phone];

  if (entry && entry.date === today) {
    if (entry.count >= MAX_DAILY_ATTEMPTS) {
      return { allowed: false, reason: `Too many attempts today. Try again tomorrow.` };
    }
    if (Date.now() - entry.lastTs < COOLDOWN_MS) {
      const secs = Math.ceil((COOLDOWN_MS - (Date.now() - entry.lastTs)) / 1000);
      return { allowed: false, reason: `Please wait ${secs}s before requesting another code.` };
    }
  }
  return { allowed: true };
}

/** Record that we just sent an OTP to `phone`. */
export function recordPhoneOtpSent(phone) {
  const map = readAttempts();
  const today = new Date().toISOString().slice(0, 10);
  const entry = map[phone];

  if (entry && entry.date === today) {
    entry.count += 1;
    entry.lastTs = Date.now();
  } else {
    map[phone] = { date: today, count: 1, lastTs: Date.now() };
  }
  writeAttempts(map);
}

/**
 * Validate an Indian mobile number (10 digits, starts with 6-9).
 */
export function isValidIndianPhone(phone) {
  return /^[6-9]\d{9}$/.test(phone);
}

// ---------------------------------------------------------------------------
// Get current user ID (Firebase UID)
// ---------------------------------------------------------------------------

/**
 * Returns the Firebase UID of the currently signed-in user, or null.
 * Use this everywhere the app previously called `supabase.auth.getUser()`.
 */
export function getCurrentUserId() {
  return auth.currentUser?.uid ?? null;
}

// ---------------------------------------------------------------------------
// Email link (magic link) sign-in
// ---------------------------------------------------------------------------

const ACTION_CODE_SETTINGS = {
  // The URL the link will redirect to — must be whitelisted in Firebase console.
  url: Platform.OS === 'web'
    ? (typeof window !== 'undefined' ? window.location.origin : 'https://localhost:8081')
    : 'https://venn-21b15.firebaseapp.com',
  handleCodeInApp: true,
};

/**
 * Send a sign-in link to the user's email.
 * Store the email so we can complete sign-in when the link is opened.
 */
export async function sendEmailLink(email) {
  await sendSignInLinkToEmail(auth, email, ACTION_CODE_SETTINGS);
  // Persist email for the verification step (the link opens in a new tab/app)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('venn_email_for_signin', email);
  }
}

/**
 * Complete sign-in from an email link (called when the app opens with a link).
 * Returns the Firebase UserCredential on success.
 */
export async function completeEmailLink(url) {
  if (!isSignInWithEmailLink(auth, url)) return null;
  let email = typeof localStorage !== 'undefined'
    ? localStorage.getItem('venn_email_for_signin')
    : null;
  if (!email) {
    // Prompt the user for their email if storage was cleared
    email = prompt('Please provide your email for confirmation');
  }
  if (!email) throw new Error('Email is required to complete sign-in.');
  const cred = await signInWithEmailLink(auth, email, url);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('venn_email_for_signin');
  }
  return cred;
}

// ---------------------------------------------------------------------------
// Phone OTP sign-in (web only — native needs @react-native-firebase/auth)
// ---------------------------------------------------------------------------

let recaptchaVerifier = null;

/**
 * Set up the invisible reCAPTCHA verifier (web only).
 * Call this once when the phone screen mounts, passing the ID of the
 * sign-in button element.
 */
export function setupRecaptcha(buttonId) {
  if (Platform.OS !== 'web') return;
  if (recaptchaVerifier) return; // already set up
  recaptchaVerifier = new RecaptchaVerifier(auth, buttonId, {
    size: 'invisible',
    callback: () => { /* reCAPTCHA solved */ },
  });
}

/**
 * Send a phone OTP. Returns a ConfirmationResult which is used to verify
 * the code later (pass it to `verifyPhoneOtp`).
 *
 * Includes spam protection checks before sending.
 */
export async function sendPhoneOtp(phone) {
  const fullPhone = `+91${phone}`;

  // Spam protection checks
  const check = canSendPhoneOtp(phone);
  if (!check.allowed) throw new Error(check.reason);

  if (!isValidIndianPhone(phone)) {
    throw new Error('Please enter a valid 10-digit Indian mobile number.');
  }

  if (Platform.OS !== 'web') {
    throw new Error('Phone auth on native requires a development build with @react-native-firebase/auth. Use email or Google sign-in instead.');
  }

  if (!recaptchaVerifier) {
    throw new Error('reCAPTCHA not initialized. Please try again.');
  }

  const confirmationResult = await signInWithPhoneNumber(auth, fullPhone, recaptchaVerifier);
  recordPhoneOtpSent(phone);
  return confirmationResult;
}

/**
 * Verify the phone OTP code.
 */
export async function verifyPhoneOtp(confirmationResult, code) {
  return await confirmationResult.confirm(code);
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

const googleProvider = new GoogleAuthProvider();

/**
 * Sign in with Google (web: popup, native: placeholder for expo-auth-session).
 */
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    return await signInWithPopup(auth, googleProvider);
  }
  // Native Google sign-in requires expo-auth-session or
  // @react-native-google-signin — left as a TODO for dev-build phase.
  throw new Error('Google sign-in on native requires additional setup. Use email or phone instead.');
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export async function signOutUser() {
  await firebaseSignOut(auth);
}

// ---------------------------------------------------------------------------
// Profile upsert — call after any successful sign-in
// ---------------------------------------------------------------------------

/**
 * Ensure a profiles row exists for the current Firebase user.
 * Firebase JWT must be fresh (call getIdToken(true) first if just signed up).
 */
export async function ensureProfile() {
  const uid = getCurrentUserId();
  if (!uid) return;

  // Force a fresh token so Supabase sees the latest custom claims
  await auth.currentUser.getIdToken(/* forceRefresh */ true);

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: uid }, { onConflict: 'id', ignoreDuplicates: true });

  if (error) {
    console.warn('Profile upsert failed:', error.message);
  }
}

/**
 * Check if onboarding is complete for the current user.
 */
export async function isOnboardingComplete() {
  const uid = getCurrentUserId();
  if (!uid) return false;
  const { data } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', uid)
    .single();
  return !!data?.onboarding_done;
}
