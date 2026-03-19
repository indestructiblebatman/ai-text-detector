'use client';

import { useState } from 'react';

export default function Home() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [improvements, setImprovements] = useState({}); // {sentenceHash: {loading, reason, suggestions, error}}
  const [tips, setTips] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);

  const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze text');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while analyzing the text. Please try again.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (level) => {
    switch (level) {
      case 'high':
        return 'bg-red-100 text-red-900';
      case 'medium':
        return 'bg-yellow-100 text-yellow-900';
      case 'low':
        return 'bg-green-100 text-green-900';
      default:
        return 'text-gray-900';
    }
  };

  const getProgressBarColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
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

  const handleImprove = async (sentence, level) => {
    const sentenceHash = getSimpleHash(sentence);
    
    if (improvements[sentenceHash]) {
      // Toggle off if already showing
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            AI Text Detector
          </h1>
          <p className="text-gray-600">
            Analyze text to detect AI-generated content with sentence-level breakdown
          </p>
        </div>

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
              disabled={loading || !text.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6">
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
                  // Add text before the tag
                  if (match.index > lastIndex) {
                    sentenceParts.push({
                      type: 'text',
                      content: results.highlighted_text.slice(lastIndex, match.index),
                    });
                  }
                  // Add highlighted text
                  const level = match[1].toLowerCase();
                  sentenceParts.push({
                    type: 'highlight',
                    level,
                    content: match[2],
                    hash: getSimpleHash(match[2]),
                  });
                  lastIndex = regex.lastIndex;
                }

                // Add remaining text
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
                                    {/* Original sentence in grey box */}
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
