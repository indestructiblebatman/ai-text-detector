'use client';

import { useState, useEffect } from 'react';

export default function DetectPage() {
  // Email verification states
  const [step, setStep] = useState(1); // 1 = email entry, 2 = OTP verification
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [otpError, setOtpError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Detection tool states
  const [isVerified, setIsVerified] = useState(false);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [improvements, setImprovements] = useState({});
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [analysesRemaining, setAnalysesRemaining] = useState(3);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

  useEffect(() => {
    // Check if email is already verified in localStorage
    const storedEmail = localStorage.getItem('verascript_email');
    if (storedEmail) {
      setEmail(storedEmail);
      setIsVerified(true);
    }
  }, []);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleSendOtp = async (e) => {
    e.preventDefault();

    if (!email.trim()) {
      setEmailError('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setEmailLoading(true);
    setEmailError('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send verification code');
      }

      // Move to OTP step
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setEmailError(err.message || 'Failed to send verification code.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    if (!otp.trim() || otp.length !== 6) {
      setOtpError('Please enter a 6-digit code');
      return;
    }

    setOtpLoading(true);
    setOtpError('');

    try {
      // Verify OTP with backend
      const verifyResponse = await fetch(
        `/api/send-otp?email=${encodeURIComponent(email)}&code=${otp}`
      );
      const verifyData = await verifyResponse.json();

      if (!verifyData.valid) {
        if (verifyData.reason === 'expired') {
          setOtpError('That code has expired. Request a new one.');
          setStep(1);
          setOtp('');
        } else {
          setOtpError('That code is incorrect, try again.');
        }
        return;
      }

      // Save email to Google Sheets via signup API
      const signupResponse = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!signupResponse.ok) {
        throw new Error('Failed to save email');
      }

      // Save to localStorage
      localStorage.setItem('verascript_email', email);
      setIsVerified(true);
      setOtp('');
    } catch (err) {
      setOtpError(err.message || 'Verification failed. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;

    setOtpLoading(true);
    setOtpError('');

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        throw new Error('Failed to resend code');
      }

      setOtp('');
      setResendCooldown(60);
    } catch (err) {
      setOtpError(err.message || 'Failed to resend code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleChangeEmail = () => {
    setIsVerified(false);
    localStorage.removeItem('verascript_email');
    setEmail('');
    setStep(1);
    setOtp('');
    setOtpError('');
    setEmailError('');
    setResults(null);
    setText('');
  };

  const getSimpleHash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  };

  const handleAnalyze = async () => {
    if (!text.trim()) {
      setError('Please paste some text to analyze');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, email }),
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
      setAnalysesRemaining(Math.max(0, analysesRemaining - 1));
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing the text. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImprove = async (sentence, level) => {
    const sentenceHash = getSimpleHash(sentence);

    if (improvements[sentenceHash]) {
      setImprovements({
        ...improvements,
        [sentenceHash]: undefined,
      });
      return;
    }

    setImprovements({
      ...improvements,
      [sentenceHash]: { loading: true, reason: '', suggestions: [], error: '' },
    });

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
      setImprovements({
        ...improvements,
        [sentenceHash]: {
          loading: false,
          reason: data.reason,
          suggestions: data.suggestions,
          error: '',
        },
      });
    } catch (err) {
      setImprovements({
        ...improvements,
        [sentenceHash]: {
          loading: false,
          reason: '',
          suggestions: [],
          error: err.message || 'Failed to generate suggestions',
        },
      });
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate tips');
      }

      const data = await response.json();
      setTips(data);
    } catch (err) {
      console.error('Error fetching tips:', err);
    } finally {
      setTipsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const getProgressBarColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Email Verification Gate
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              AI Text Detector
            </h1>
            <p className="text-gray-600">
              Analyze text to detect AI-generated content
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-8">
            {step === 1 ? (
              // Step 1: Email Entry
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setEmailError('');
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    disabled={emailLoading}
                  />
                </div>

                {emailError && (
                  <div className="text-sm text-red-600">
                    {emailError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                >
                  {emailLoading ? 'Sending code...' : 'Send verification code'}
                </button>
              </form>
            ) : (
              // Step 2: OTP Verification
              <div className="space-y-6">
                <div>
                  <p className="text-center text-gray-600 mb-4">
                    We sent a code to<br />
                    <span className="font-semibold text-gray-900">{email}</span>
                  </p>
                </div>

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">
                      Verification code
                    </label>
                    <input
                      type="text"
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setOtp(val);
                        setOtpError('');
                      }}
                      placeholder="000000"
                      maxLength="6"
                      className="w-full px-4 py-4 text-center text-4xl tracking-widest border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 text-gray-900 font-mono"
                      disabled={otpLoading}
                      autoFocus
                    />
                  </div>

                  {otpError && (
                    <div className="text-sm text-red-600 text-center">
                      {otpError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={otpLoading || otp.length !== 6}
                    className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
                  >
                    {otpLoading ? 'Verifying...' : 'Verify'}
                  </button>
                </form>

                <div className="text-center">
                  <button
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || otpLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resendCooldown > 0 ? (
                      <span>Resend code in {resendCooldown}s</span>
                    ) : (
                      <span>Resend code</span>
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <button
                    onClick={() => {
                      setStep(1);
                      setOtp('');
                      setOtpError('');
                    }}
                    className="text-sm text-gray-600 hover:text-gray-700 transition-colors"
                  >
                    Use different email
                  </button>
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-500 mt-6">
              Free forever. No spam.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main Detection Tool
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Text Detector
          </h1>
          <p className="text-gray-600">
            Analyze text to detect AI-generated content with instant feedback
          </p>
          <div className="mt-4 flex justify-center items-center gap-4">
            <span className="text-sm text-gray-600">
              Email: <span className="font-semibold text-gray-900">{email}</span>
            </span>
            <button
              onClick={handleChangeEmail}
              className="text-sm px-3 py-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              Change
            </button>
          </div>
        </div>

        {/* Analyses Remaining */}
        {analysesRemaining > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-center">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">{analysesRemaining}</span> free {analysesRemaining === 1 ? 'analysis' : 'analyses'} remaining today
            </p>
          </div>
        )}

        {/* Input Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Paste your text here
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your assignment, essay, or any text you want to analyze..."
            className="w-full h-48 p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-900"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-gray-500">
              {wordCount} words
            </span>
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim() || analysesRemaining === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className={`px-4 py-3 rounded-lg mb-6 ${
            error.includes('free analyses')
              ? 'bg-yellow-50 border border-yellow-200 text-yellow-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {error}
          </div>
        )}

        {/* Results Section */}
        {results && (
          <div className="space-y-6">
            {/* Score Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Analysis Results
              </h2>

              {/* Overall Score */}
              <div className="mb-6">
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-5xl font-bold text-gray-900">
                    {results.overall_score}%
                  </span>
                  <span className="text-lg text-gray-600">
                    AI Likelihood
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${getProgressBarColor(results.overall_score)} transition-all duration-500`}
                    style={{ width: `${results.overall_score}%` }}
                  />
                </div>
              </div>

              {/* Verdict */}
              <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-2">Verdict</h3>
                <p className="text-gray-700 leading-relaxed">
                  {results.verdict}
                </p>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-red-500 rounded"></span>
                  <span className="text-gray-700">High AI likelihood</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-yellow-500 rounded"></span>
                  <span className="text-gray-700">Medium AI likelihood</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded"></span>
                  <span className="text-gray-700">Low AI likelihood</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-gray-300 rounded"></span>
                  <span className="text-gray-700">Human-written</span>
                </div>
              </div>
            </div>

            {/* Highlighted Text Section */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Highlighted Analysis
              </h3>
              {(() => {
                const regex = /\[(HIGH|MEDIUM|LOW)\](.*?)\[\/\1\]/g;
                let lastIndex = 0;
                let match;
                const sentenceParts = [];

                while ((match = regex.exec(results.highlighted_text)) !== null) {
                  if (match.index > lastIndex) {
                    sentenceParts.push({
                      type: 'text',
                      content: results.highlighted_text.slice(lastIndex, match.index),
                    });
                  }
                  const level = match[1].toLowerCase();
                  sentenceParts.push({
                    type: 'highlight',
                    level,
                    content: match[2],
                    hash: getSimpleHash(match[2]),
                  });
                  lastIndex = regex.lastIndex;
                }

                if (lastIndex < results.highlighted_text.length) {
                  sentenceParts.push({
                    type: 'text',
                    content: results.highlighted_text.slice(lastIndex),
                  });
                }

                return (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 leading-relaxed text-gray-900">
                    {sentenceParts.map((part, idx) => {
                      if (part.type === 'text') {
                        return <span key={idx}>{part.content}</span>;
                      } else {
                        const bgColor =
                          part.level === 'high'
                            ? 'bg-red-200'
                            : part.level === 'medium'
                            ? 'bg-yellow-200'
                            : 'bg-green-200';
                        const improvement = improvements[part.hash];
                        const isImprovable = part.level === 'high' || part.level === 'medium';

                        return (
                          <span key={idx}>
                            <span className={`${bgColor} rounded px-1`}>
                              {part.content}
                            </span>
                            {isImprovable && (
                              <span className="ml-1">
                                <button
                                  onClick={() => handleImprove(part.content, part.level)}
                                  className="text-xs px-2 py-0.5 bg-orange-500 hover:bg-orange-600 text-white rounded align-baseline transition-colors"
                                >
                                  {improvement ? '✕' : '✎'}
                                </button>
                                {improvement && (
                                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg space-y-2 mb-3">
                                    <div className="bg-gray-200 p-2 rounded border border-gray-300">
                                      <p className="text-sm text-gray-900 italic">{part.content}</p>
                                    </div>

                                    {improvement.loading ? (
                                      <div className="flex items-center gap-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                                        <span className="text-sm text-gray-600">Generating suggestions...</span>
                                      </div>
                                    ) : improvement.error ? (
                                      <p className="text-sm text-red-600">{improvement.error}</p>
                                    ) : (
                                      <>
                                        <p className="text-sm font-bold text-gray-900">
                                          Why: {improvement.reason}
                                        </p>
                                        <div className="space-y-2">
                                          <p className="text-xs text-gray-600 font-semibold">Suggestions:</p>
                                          {improvement.suggestions.map((suggestion, sIdx) => (
                                            <div
                                              key={sIdx}
                                              className="bg-white p-2 rounded border border-yellow-100 flex justify-between items-start gap-2"
                                            >
                                              <p className="text-sm text-gray-800 flex-1">{suggestion}</p>
                                              <button
                                                onClick={() => copyToClipboard(suggestion)}
                                                className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded whitespace-nowrap transition-colors"
                                              >
                                                Copy
                                              </button>
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
                      }
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Get Tips Button */}
            {!tipsLoading && !tips && (
              <div className="text-center">
                <button
                  onClick={handleGetTips}
                  className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  💡 Get personalized writing tips
                </button>
              </div>
            )}

            {/* Writing Tips Section */}
            {tips && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">💡</span>
                  <h3 className="text-lg font-bold text-gray-900">
                    Personalized Writing Tips
                  </h3>
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

            {tipsLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !results && !error && (
          <div className="text-center py-12 text-gray-500">
            <p>Paste your text and click "Analyze" to see results</p>
          </div>
        )}
      </div>
    </div>
  );
}
