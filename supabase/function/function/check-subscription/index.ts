import { serve } from 'https://deno.land/std/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { user_id, action } = await req.json()

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user_id)
    .single()

  if (!profile) {
    return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 })
  }

  // AI kontrolü
  if (action === 'ai_request') {
    if (
      profile.subscription_type === 'independent' &&
      profile.ai_used >= profile.ai_quota
    ) {
      return new Response(
        JSON.stringify({ error: 'AI quota exceeded' }),
        { status: 403 }
      )
    }
  }

  return new Response(JSON.stringify({ allowed: true }))
})
