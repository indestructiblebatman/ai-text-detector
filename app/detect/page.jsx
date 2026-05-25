'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/auth-helpers-nextjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export default function DetectPage() {
  const [supabase, setSupabase] = useState(null);
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [improvements, setImprovements] = useState({});
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [remainingWords, setRemainingWords] = useState(500);
  const [totalWords] = useState(500);

  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const userEmail = session?.user?.email ?? '';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setSupabase(createBrowserClient(supabaseUrl, supabaseKey));
  }, []);

  useEffect(() => {
    if (!supabase) return;

    const initAuth = async () => {
      const url = window.location.href;
      const hash = window.location.hash;
      console.log('Supabase auth redirect URL:', url);
      console.log('Supabase auth redirect hash:', hash);

      // Parse error messages from query or hash and surface to the UI
      const searchParams = new URLSearchParams(window.location.search || '');
      const hashParams = new URLSearchParams((window.location.hash || '').replace(/^#/, ''));
      const rawError = searchParams.get('error_description') || hashParams.get('error_description') || searchParams.get('error') || hashParams.get('error');
      if (rawError) {
        const friendly = decodeURIComponent(String(rawError)).replace(/\+/g, ' ');
        setAuthMessage(friendly);
      }

      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);

      setSession(currentSession);

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, authSession) => {
        setSession(authSession);
      });

      return () => {
        authListener?.subscription?.unsubscribe();
      };
    };

    const cleanup = initAuth();
    return () => {
      cleanup?.then((unsub) => unsub?.());
    };
  }, [supabase]);

  useEffect(() => {
    if (!session?.access_token) return;

    const fetchUsage = async () => {
      try {
        const response = await fetch('/api/usage', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) return;
        const data = await response.json();
        if (typeof data.remainingWords === 'number') {
          setRemainingWords(data.remainingWords);
        }
      } catch (err) {
        console.error('Failed to fetch usage:', err);
      }
    };

    fetchUsage();
  }, [session]);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setAuthMessage('Please enter your email.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setAuthMessage('Please enter a valid email address.');
      return;
    }

    if (!supabase) {
      setAuthMessage('Auth client not initialized yet. Refresh the page if this continues.');
      setAuthLoading(false);
      return;
    }

    setAuthLoading(true);
    setAuthMessage('');

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/complete`,
      },
    });

    if (error) {
      setAuthMessage(error.message || 'Failed to send login link.');
    } else {
      setAuthMessage('Check your email for the login link.');
      setEmailSent(true);
    }

    setAuthLoading(false);
  };

  const resendLogin = async () => {
    // reuse handleLogin logic without a browser event
    await handleLogin({ preventDefault: () => {} });
  };

  const handleLogout = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setEmail('');
    setText('');
    setResults(null);
    setError('');
    setTips(null);
    setImprovements({});
    setRemainingWords(totalWords);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please paste some text to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    if (!session?.access_token) {
      setError('You must be signed in to analyze text.');
      setLoading(false);
      return;
    }

    try {
      if (wordCount > remainingWords) {
        setError(`You only have ${remainingWords}/${totalWords} words remaining today.`);
        return;
      }

      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ text }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        setError(errorData.error);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze text');
      }

      const data = await response.json();
      setResults(data);
      if (typeof data.remainingWords === 'number') {
        setRemainingWords(data.remainingWords);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getSimpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i += 1) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash &= hash;
    }
    return hash.toString();
  };

  const handleImprove = async (sentence, level) => {
    const sentenceHash = getSimpleHash(sentence);

    if (improvements[sentenceHash]) {
      setImprovements({ ...improvements, [sentenceHash]: undefined });
      return;
    }

    setImprovements({ ...improvements, [sentenceHash]: { loading: true, reason: '', suggestions: [], error: '' } });

    try {
      const response = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence, level }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate suggestions');
      }

      const data = await response.json();
      setImprovements({ ...improvements, [sentenceHash]: { loading: false, reason: data.reason, suggestions: data.suggestions, error: '' } });
    } catch (err) {
      setImprovements({ ...improvements, [sentenceHash]: { loading: false, reason: '', suggestions: [], error: err.message || 'Failed to generate suggestions' } });
    }
  };

  const handleGetTips = async () => {
    if (tipsLoading || tips) return;
    setTipsLoading(true);
    try {
      const response = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) throw new Error('Failed to generate tips');
      const data = await response.json();
      setTips(data);
    } catch (err) {
      console.error('Error fetching tips:', err);
    } finally {
      setTipsLoading(false);
    }
  };

  const copyToClipboard = (textValue) => navigator.clipboard.writeText(textValue);

  const getProgressBarColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Verascript</h1>
            <p className="text-gray-600">Sign in with email to analyze text and track usage.</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-8">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setAuthMessage('');
                  }}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  disabled={authLoading || emailSent}
                />
              </div>
              {authMessage && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">{authMessage}</p>
                  {(authMessage.toLowerCase().includes('expired') || authMessage.toLowerCase().includes('invalid')) && (
                    <button
                      type="button"
                      onClick={resendLogin}
                      disabled={authLoading}
                      className="text-sm text-blue-600 hover:underline ml-4"
                    >
                      Resend login link
                    </button>
                  )}
                </div>
              )}
              {emailSent && (
                <div className="mt-3 text-sm text-gray-600">
                  <p>
                    We sent a magic sign-in link to your email. If the link does not work, copy and paste the link into a full browser (not your email app's preview).
                    If you see an "expired" message, click "Resend login link" to request a fresh link.
                  </p>
                </div>
              )}
              <button
                type="submit"
                disabled={authLoading || emailSent}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
              >
                {authLoading ? 'Sending login link...' : 'Send login link'}
              </button>
            </form>
            <p className="text-center text-xs text-gray-500 mt-6">
              Uses Supabase passwordless auth. No password, no OTP store, and no separate signup flow.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Verascript</h1>
          <p className="text-gray-600">Detect AI-generated content with sentence-level breakdown</p>
          <div className="mt-4 flex flex-col sm:flex-row justify-center items-center gap-4">
            <span className="text-sm text-gray-600">
              Signed in as <span className="font-semibold text-gray-900">{userEmail}</span>
            </span>
            <button
              onClick={handleLogout}
              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Paste your text here</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your assignment, essay, or any text you want to analyze..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 gap-3">
            <div className="text-sm text-gray-500">
              <p>{wordCount} words</p>
              <p className="text-xs text-gray-400 mt-1">{remainingWords}/{totalWords} remaining today</p>
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim() || remainingWords === 0 || wordCount > remainingWords}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {error && (
          <div className={`px-4 py-3 rounded-lg mb-6 ${error.includes('free analyses') ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-red-50 border border-red-200 text-red-800'}`}>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {!loading && !results && !error && (
          <div className="text-center py-12 text-gray-500">
            <p>Paste your text and click "Analyze" to see results</p>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Analysis Results</h2>
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">{results.overall_score}%</span>
                  <span className="text-lg text-gray-600">AI Likelihood</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div className={`h-full ${getProgressBarColor(results.overall_score)} transition-all duration-500`} style={{ width: `${results.overall_score}%` }} />
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Verdict</h3>
                <p className="text-gray-700 leading-relaxed">{results.verdict}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                {[[ 'bg-red-500', 'High AI likelihood' ], [ 'bg-yellow-500', 'Medium AI likelihood' ], [ 'bg-green-500', 'Low AI likelihood' ], [ 'bg-gray-300', 'Human-written' ]].map(([color, label]) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-3 h-3 ${color} rounded`} />
                    <span className="text-gray-700">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Highlighted Analysis</h3>
              {(() => {
                const regex = /\[(HIGH|MEDIUM|LOW)\](.*?)\[\/\1\]/g;
                let lastIndex = 0;
                let match;
                const parts = [];
                while ((match = regex.exec(results.highlighted_text)) !== null) {
                  if (match.index > lastIndex) parts.push({ type: 'text', content: results.highlighted_text.slice(lastIndex, match.index) });
                  parts.push({ type: 'highlight', level: match[1].toLowerCase(), content: match[2], hash: getSimpleHash(match[2]) });
                  lastIndex = regex.lastIndex;
                }
                if (lastIndex < results.highlighted_text.length) parts.push({ type: 'text', content: results.highlighted_text.slice(lastIndex) });

                return (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 leading-relaxed text-gray-900">
                    {parts.map((part, idx) => {
                      if (part.type === 'text') return <span key={idx}>{part.content}</span>;
                      const bgColor = part.level === 'high' ? 'bg-red-200' : part.level === 'medium' ? 'bg-yellow-200' : 'bg-green-200';
                      const improvement = improvements[part.hash];
                      const isImprovable = part.level === 'high' || part.level === 'medium';
                      return (
                        <span key={idx}>
                          <span className={`${bgColor} rounded px-1`}>{part.content}</span>
                          {isImprovable && (
                            <span className="ml-1">
                              <button onClick={() => handleImprove(part.content, part.level)} className="text-xs px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded align-baseline transition-colors">
                                {improvement ? '?' : '?'}
                              </button>
                              {improvement && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2 mb-3">
                                  <div className="bg-gray-200 p-2 rounded border border-gray-300">
                                    <p className="text-sm text-gray-900 italic">{part.content}</p>
                                  </div>
                                  {improvement.loading ? (
                                    <div className="flex items-center gap-2">
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500" />
                                      <span className="text-sm text-gray-600">Generating suggestions...</span>
                                    </div>
                                  ) : improvement.error ? (
                                    <p className="text-sm text-red-600">{improvement.error}</p>
                                  ) : (
                                    <>
                                      <p className="text-sm font-bold text-gray-900">Why: {improvement.reason}</p>
                                      <div className="space-y-2">
                                        <p className="text-xs text-gray-600 font-semibold">Suggestions:</p>
                                        {improvement.suggestions.map((suggestion, sIdx) => (
                                          <div key={sIdx} className="bg-white p-2 rounded border border-yellow-100 flex justify-between items-start gap-2">
                                            <p className="text-sm text-gray-800 flex-1">{suggestion}</p>
                                            <button onClick={() => copyToClipboard(suggestion)} className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap transition-colors">Copy</button>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </span>
                          )}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {!tipsLoading && !tips && (
              <div className="text-center">
                <button onClick={handleGetTips} className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors">
                  ?? Get personalized writing tips
                </button>
              </div>
            )}

            {tipsLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
              </div>
            )}

            {tips && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">??</span>
                  <h3 className="text-lg font-bold text-gray-900">Personalized Writing Tips</h3>
                </div>
                <div className="space-y-3">
                  {tips.tips.map((tip, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                      <span className="text-lg font-bold text-green-600 flex-shrink-0">{idx + 1}.</span>
                      <p className="text-gray-800 text-sm">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
