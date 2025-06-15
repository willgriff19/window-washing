import { useState, useEffect } from 'react';
import { lookupPrice } from '@/data/prices';
import { formatCurrency } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface QuoteCalculatorProps {
  onQuoteChange: (quote: number) => void;
}

export function QuoteCalculator({ onQuoteChange }: QuoteCalculatorProps) {
  const [panes, setPanes] = useState<number | undefined>(undefined);
  const [insideOutsidePrice, setInsideOutsidePrice] = useState<number>(0);
  const [outsideOnlyPrice, setOutsideOnlyPrice] = useState<number>(0);
  const [message, setMessage] = useState<string>('Enter the number of panes to see the suggested quote.');

  const baseButtonClass = "rounded-full shadow touch-manipulation min-w-[48px] min-h-[48px] flex items-center justify-center focus:outline-none focus:ring-2";

  useEffect(() => {
    if (panes === undefined || panes === 0) {
      setMessage('Enter the number of panes to see the suggested quote.');
      setInsideOutsidePrice(0);
      setOutsideOnlyPrice(0);
      onQuoteChange(0);
    } else if (panes < 10) {
      setMessage('Waste of time.');
      setInsideOutsidePrice(0);
      setOutsideOnlyPrice(0);
      onQuoteChange(0);
    } else if (panes > 90) {
      setMessage('Lmao fr bruh just walk away');
      setInsideOutsidePrice(0);
      setOutsideOnlyPrice(0);
      onQuoteChange(0);
    } else {
      const price = lookupPrice(panes);
      if (price) {
        setMessage('');
        setInsideOutsidePrice(price.insideOutside);
        setOutsideOnlyPrice(price.outsideOnly);
        onQuoteChange(price.insideOutside);
      } else {
        setMessage('');
        setInsideOutsidePrice(0);
        setOutsideOnlyPrice(0);
        onQuoteChange(0);
      }
    }
  }, [panes, onQuoteChange]);

  // Counter button handlers
  const increment = () => setPanes((prev) => (prev ? prev + 1 : 1));
  const decrement = () => setPanes((prev) => (prev && prev > 1 ? prev - 1 : undefined));
  const reset = () => setPanes(undefined);

  // Input handler (allow direct editing)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setPanes(isNaN(val) ? undefined : val);
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  return (
    <div className="space-y-4 p-6 bg-blue-50 rounded-xl shadow-md border border-gray-200 mb-6">
      <h2 className="text-2xl font-semibold text-center text-blue-900 mb-2">Quote Calculator</h2>
      <div className="flex items-center justify-center gap-4 md:gap-8 w-full">
        {/* Reset Button */}
        <motion.button
          type="button"
          aria-label="Reset counter"
          onClick={reset}
          className={`${baseButtonClass} bg-red-100 border border-red-500 text-red-700 w-auto px-3 md:px-4 h-12 md:h-14 text-lg md:text-xl font-bold focus:ring-red-400 hover:bg-red-200`}
          whileTap={{ scale: 0.95 }}
        >
          <span className="text-xl md:text-2xl">⟲</span>
          <span className="font-semibold">Reset</span>
        </motion.button>
        {/* Decrement Button */}
        <motion.button
          type="button"
          aria-label="Decrement panes"
          onClick={decrement}
          disabled={!panes}
          className={`${baseButtonClass} bg-blue-200 text-blue-900 w-24 h-24 md:w-32 md:h-32 text-4xl md:text-5xl font-bold focus:ring-blue-400 hover:bg-blue-300 p-4 -m-4 ${!panes ? 'opacity-50 cursor-not-allowed' : ''}`}
          whileTap={{ scale: 0.95 }}
        >
          −
        </motion.button>
        {/* Input Field */}
        <input
          type="number"
          id="panes"
          value={panes === undefined ? '' : panes}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          min="0"
          className="block w-20 md:w-28 text-center rounded-lg border border-gray-300 px-3 py-4 md:py-5 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-4xl md:text-5xl font-bold bg-white"
          aria-label="Number of panes"
        />
        {/* Increment Button */}
        <motion.button
          type="button"
          aria-label="Increment panes"
          onClick={increment}
          className={`${baseButtonClass} bg-blue-500 text-white w-24 h-24 md:w-32 md:h-32 text-4xl md:text-5xl font-bold focus:ring-blue-400 hover:bg-blue-600 p-4 -m-4`}
          whileTap={{ scale: 0.95 }}
        >
          +
        </motion.button>
      </div>
      {message ? (
        <div className="text-center text-lg font-semibold text-blue-700 py-3">
          {message}
        </div>
      ) : (
        <div className="flex flex-row gap-4 mt-6">
          <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center">
            <span className="text-base font-semibold text-gray-700 mb-1">Inside + Outside </span>
            <span className="text-2xl md:text-3xl font-bold text-blue-900">{formatCurrency(insideOutsidePrice)}</span>
          </div>
          <div className="flex-1 bg-white p-4 rounded-lg shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center">
            <span className="text-base font-semibold text-gray-700 mb-1">Outside Only </span>
            <span className="text-2xl md:text-3xl font-bold text-blue-900">{formatCurrency(outsideOnlyPrice)}</span>
          </div>
        </div>
      )}
    </div>
  );
} 