// /api/ai/generate.js
import { createClient } from '@supabase/supabase-js';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// OpenAI çağrısı
async function callOpenAI(prompt, apiKey, model = 'gpt-3.5-turbo', temperature = 0.7, maxTokens = 1000) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Etsy business assistant. Help with product descriptions, SEO, sales analysis, and business advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Anthropic (Claude) çağrısı
async function callAnthropic(prompt, apiKey, model = 'claude-3-haiku-20240307', temperature = 0.7, maxTokens = 1000) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      system: 'You are an expert Etsy business assistant. Help with product descriptions, SEO, sales analysis, and business advice.',
      max_tokens: maxTokens,
      temperature: temperature
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.content[0].text;
}

// OpenRouter çağrısı
async function callOpenRouter(prompt, apiKey, model = 'openai/gpt-3.5-turbo', temperature = 0.7, maxTokens = 1000) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'https://your-domain.com', // Kendi domain'iniz
      'X-Title': 'Etsy AI POD'
    },
    body: JSON.stringify({
      model: model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert Etsy business assistant. Help with product descriptions, SEO, sales analysis, and business advice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: maxTokens
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// Google Gemini çağrısı
async function callGoogleGemini(prompt, apiKey, model = 'gemini-pro', temperature = 0.7) {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            {
              text: `You are an expert Etsy business assistant. Help with product descriptions, SEO, sales analysis, and business advice.\n\n${prompt}`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Google Gemini API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

// Main handler
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  // Sadece POST methodunu kabul et
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }

  try {
    const { prompt, provider, api_key, model, temperature, max_tokens } = await req.json();

    // Validasyon
    if (!prompt) {
      return new Response(JSON.stringify({ error: 'Prompt is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    if (!provider) {
      return new Response(JSON.stringify({ error: 'Provider is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    let aiResponse;
    const providerLower = provider.toLowerCase();

    // Provider'a göre API çağrısı yap
    if (providerLower.includes('openai')) {
      if (!api_key) {
        return new Response(JSON.stringify({ error: 'API key is required for OpenAI' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      aiResponse = await callOpenAI(prompt, api_key, model, temperature, max_tokens);
    } 
    else if (providerLower.includes('anthropic') || providerLower.includes('claude')) {
      if (!api_key) {
        return new Response(JSON.stringify({ error: 'API key is required for Anthropic' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      aiResponse = await callAnthropic(prompt, api_key, model, temperature, max_tokens);
    }
    else if (providerLower.includes('openrouter')) {
      if (!api_key) {
        return new Response(JSON.stringify({ error: 'API key is required for OpenRouter' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      aiResponse = await callOpenRouter(prompt, api_key, model, temperature, max_tokens);
    }
    else if (providerLower.includes('google') || providerLower.includes('gemini')) {
      if (!api_key) {
        return new Response(JSON.stringify({ error: 'API key is required for Google Gemini' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
          }
        });
      }
      aiResponse = await callGoogleGemini(prompt, api_key, model, temperature);
    }
    else {
      return new Response(JSON.stringify({ error: `Unsupported provider: ${provider}` }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    // Başarılı yanıt
    return new Response(JSON.stringify({ 
      response: aiResponse,
      provider: provider,
      model: model,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message,
      fallback: true
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

// Vercel için export
export const config = {
  runtime: 'edge', // Vercel Edge Runtime için
};