'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center py-8 px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          AI Text Detector
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Detect AI-generated content in your essays, assignments, and documents. 
          Get instant feedback with detailed analysis and writing improvement suggestions.
        </p>
        
        <div className="space-y-4 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📊</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Instant Analysis</h3>
              <p className="text-gray-600 text-sm">Get AI likelihood score with highlighted problematic phrases</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">✏️</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Writing Improvements</h3>
              <p className="text-gray-600 text-sm">Get actionable suggestions to rewrite AI-sounding sentences</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">Personalized Tips</h3>
              <p className="text-gray-600 text-sm">Learn how to write more authentically based on patterns in your text</p>
            </div>
          </div>
        </div>

        <Link
          href="/detect"
          className="inline-block px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors text-lg"
        >
          Get Started Free →
        </Link>

        <p className="text-gray-600 text-sm mt-8">
          Free forever. No credit card required. 3 analyses per day.
        </p>
      </div>
    </div>
  );
}
