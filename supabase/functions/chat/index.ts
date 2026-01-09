import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { clientId, message, sessionId } = await req.json()

    if (!clientId || !message || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, message, sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: client, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('active', true)
      .single()

    if (error || !client) {
      return new Response(
        JSON.stringify({ error: 'Client not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const systemPrompt = buildSystemPrompt(client.site_data)

    const geminiResponse = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: message }] }]
      })
    })

    if (!geminiResponse.ok) {
      console.error('Gemini API error:', await geminiResponse.text())
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const geminiData = await geminiResponse.json()
    const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      'Sorry, I could not get a response. Please try again.'

    supabase.from('chat_logs').insert([
      { client_id: clientId, session_id: sessionId, role: 'user', message },
      { client_id: clientId, session_id: sessionId, role: 'assistant', message: reply }
    ]).then(() => {}).catch(console.error)

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildSystemPrompt(siteData: any): string {
  const { business, pages, services, staff, faqs, appointmentInfo } = siteData

  let prompt = `You are a friendly, casual assistant for ${business.name}. ${business.description}

TONE & STYLE:
- Be conversational and warm, like texting with a helpful friend
- Keep responses SHORT - 1-2 sentences max unless they ask for details
- Use casual language ("Yeah!", "Sure thing!", "Happy to help!")
- Include a relevant link when it makes sense

BUSINESS INFO:
- Phone: ${business.phone}
- Email: ${business.email}
- Hours: ${business.hours}
- Service Area: ${business.serviceArea}

WEBSITE PAGES:\n`

  if (pages) {
    Object.entries(pages).forEach(([name, url]) => {
      prompt += `- ${name}: ${url}\n`
    })
  }

  prompt += `\nSERVICES:\n`
  if (services) {
    services.forEach((s: any) => {
      prompt += `- ${s.name}: ${s.description}\n`
    })
  }

  if (staff?.length > 0) {
    prompt += `\nSTAFF:\n`
    staff.forEach((s: any) => {
      prompt += `- ${s.name} (${s.credentials}): ${s.role || ''} ${s.specialties ? 'Specializes in: ' + s.specialties : ''}\n`
    })
  }

  if (appointmentInfo) {
    prompt += `\nAPPOINTMENT INFO:
- ${appointmentInfo.scheduling}
- ${appointmentInfo.windows}
- ${appointmentInfo.deposit}
- Emergency: ${appointmentInfo.emergency}\n`
  }

  if (faqs?.length > 0) {
    prompt += `\nCOMMON QUESTIONS:\n`
    faqs.forEach((f: any) => {
      prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`
    })
  }

  return prompt
}
