'use client';

import { useState } from 'react';
import { QuoteCalculator } from '@/components/QuoteCalculator';
import { JobForm } from '@/components/JobForm';
import { Toaster } from '@/components/ui/toaster';

export default function Home() {
  const [quote, setQuote] = useState(0);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 p-4">
      <div className="w-full max-w-2xl mx-auto space-y-8 p-6 md:p-8 bg-white rounded-2xl shadow-xl border border-gray-200">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 text-gray-900">Window Washing Job Manager</h1>
        <QuoteCalculator onQuoteChange={setQuote} />
        <JobForm initialQuote={quote} />
      </div>
      <Toaster />
    </main>
  );
}
