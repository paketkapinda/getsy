// api.js
// Simple wrapper for calling Supabase Edge Functions.
// Supports MODE: STATIC | SERVER | REAL (set via setMode or localStorage).

import { supabase } from './supabaseClient.js';

const MODE_KEY = 'etsy_mode';

let currentMode = localStorage.getItem(MODE_KEY) || 'SERVER';

export function setMode(mode) {
  currentMode = mode;
  localStorage.setItem(MODE_KEY, mode);
}

export function getMode() {
  return currentMode;
}

/**
 * Call a Supabase Edge Function by name.
 * When MODE=STATIC, this returns mock responses for demo.
 * When MODE=SERVER or REAL, it calls the deployed function.
 */
export async function callFunction(name, payload = {}) {
  if (currentMode === 'STATIC') {
    return mockCall(name, payload);
  }

  const { data, error } = await supabase.functions.invoke(name, {
    body: payload,
  });

  if (error) {
    throw error;
  }
  return data;
}

// REST-like API wrapper for compatibility with existing code
export const api = {
  async post(path, payload = {}) {
    // Extract function name from path like '/functions/v1/ai-seo' -> 'ai-seo'
    const match = path.match(/\/([^/]+)$/);
    if (match) {
      const functionName = match[1];
      return callFunction(functionName, payload);
    }
    throw new Error(`Invalid API path: ${path}`);
  },
  async get(path, params = {}) {
    // For GET requests, include params in payload
    const match = path.match(/\/([^/]+)$/);
    if (match) {
      const functionName = match[1];
      return callFunction(functionName, params);
    }
    throw new Error(`Invalid API path: ${path}`);
  }
};

async function mockCall(name, payload) {
  // Lightweight mocks so frontend can be demoed without backend.
  switch (name) {
    case 'ai-top-seller':
      return {
        analysis_id: 'mock-analysis',
        trend_scores: [
          { listing_id: '1', listing_title: 'Mock bestseller mug', trend_score: 0.92 },
          { listing_id: '2', listing_title: 'Mock minimalist shirt', trend_score: 0.88 },
        ],
        forecasts: {
          horizon_months: 3,
        },
      };
    case 'ai-mockup':
      return {
        mockup_ids: ['mock-1', 'mock-2', 'mock-3'],
        storage_urls: [
          'https://placehold.co/600x600/png',
          'https://placehold.co/600x600/png',
          'https://placehold.co/600x600/png',
        ],
      };
    case 'pod-send-order':
      return {
        tracking_number: 'TRACK-MOCK-123',
        status: 'sent',
      };
    default:
      return { ok: true, name, payload };
  }
}


