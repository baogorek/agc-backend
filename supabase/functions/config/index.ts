import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const url = new URL(req.url)
    const clientId = url.searchParams.get('clientId')
    const widgetId = url.searchParams.get('widgetId') || 'default'

    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: clientId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: client, error } = await supabase
      .from('clients')
      .select('site_data, allowed_origins, active')
      .eq('id', clientId)
      .single()

    if (error || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!client.active) {
      return new Response(
        JSON.stringify({ error: 'Client is inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Origin validation
    const origin = req.headers.get('origin')
    const allowedOrigins: string[] = client.allowed_origins || []
    if (origin && !allowedOrigins.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Extract widget config
    const siteData = client.site_data || {}
    const widgetConfig = siteData.widgetConfig || {}

    // Get specific widget config or fall back to default
    const config = widgetConfig[widgetId] || widgetConfig['default'] || {}

    return new Response(
      JSON.stringify({
        clientId,
        widgetId,
        bubbleImage: config.bubbleImage || null,
        brandColor: config.brandColor || '#2563eb',
        greeting: config.greeting || null,
        persona: config.persona || null,
        position: config.position || 'right',
        bottomOffset: config.bottomOffset || 0,
        horizontalMargin: config.horizontalMargin || 40,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Config function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
