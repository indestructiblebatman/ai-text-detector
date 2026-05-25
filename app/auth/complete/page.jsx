"use client";

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function AuthCompletePage() {
  const [supabase, setSupabase] = useState(null);
  const [status, setStatus] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [href, setHref] = useState('');
  const [hash, setHash] = useState('');
  const [showDebug, setShowDebug] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setSupabase(createBrowserClient(supabaseUrl, supabaseKey));
    setHref(window.location.href);
    setHash(window.location.hash);

    const searchParams = new URLSearchParams(window.location.search || '');
    const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
    const rawError = searchParams.get('error_description') || hashParams.get('error_description');
    const rawErrorCode = searchParams.get('error_code') || hashParams.get('error_code');
    const debugParam = searchParams.get('debug') || hashParams.get('debug');

    if (debugParam === 'true') {
      setShowDebug(true);
    }

    if (rawError) {
      const friendly = decodeURIComponent(String(rawError)).replace(/\+/g, ' ');
      setErrorMessage(friendly);
      setStatus('This link cannot be used. Please request a new sign-in link.');
    } else if (rawErrorCode) {
      setErrorMessage(rawErrorCode.replace(/_/g, ' '));
      setStatus('This link could not be completed. Please request a new sign-in link.');
    }
  }, []);

  const completeSignIn = async () => {
    if (!supabase) return;
    setStatus('Completing sign-in...');
    try {
      // Wait for auth state change - Supabase should pick up the token from the URL
      const { data, error } = await new Promise((resolve) => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
          console.log('Auth state changed:', event, session?.user?.email);
          if (session) {
            resolve({ data: { session }, error: null });
            subscription?.unsubscribe();
          }
        });

        // Timeout after 5 seconds if no session is found
        setTimeout(() => {
          subscription?.unsubscribe();
          resolve({ data: { session: null }, error: null });
        }, 5000);
      });

      if (!data?.session) {
        console.error('Session still not found. Checking URL hash...');
        const { data: { session }, error: getSessionError } = await supabase.auth.getSession();
        if (getSessionError) throw getSessionError;
        if (!session) {
          setStatus('No active session found yet. Please try again.');
          return;
        }
      }

      setStatus('Sign-in complete. Redirecting...');
      window.location.href = '/detect';
    } catch (err) {
      console.error('Error completing sign-in:', err);
      setStatus(err?.message || 'Failed to complete sign-in.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-xl font-bold mb-4">Complete sign-in</h1>
        <p className="text-sm text-gray-700 mb-4">This page captures the redirect from your email link. Click the button below to finish signing in.</p>
        {errorMessage ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Error:</strong> {errorMessage}
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p>Your email link was accepted. Click the button below to complete sign-in.</p>
            {showDebug && (
              <div className="mt-3 text-xs text-gray-500 break-all">
                <div className="mb-2"><strong>URL:</strong></div>
                <div>{href}</div>
                <div className="mt-2"><strong>Hash:</strong></div>
                <div>{hash}</div>
              </div>
            )}
          </div>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={completeSignIn}
            disabled={!!errorMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Complete sign-in
          </button>
          {errorMessage && (
            <a href="/detect" className="text-sm text-blue-600 hover:underline">
              Back to sign in page
            </a>
          )}
          <span className="text-sm text-gray-600">{status}</span>
        </div>
      </div>
    </div>
  );
}
