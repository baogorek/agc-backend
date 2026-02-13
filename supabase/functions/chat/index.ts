// NOTE: buildSystemPrompt must stay in sync with dev-studio/server/prompt-builder.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const GCP_PROJECT_ID = Deno.env.get('GCP_PROJECT_ID')
const GCP_CLIENT_EMAIL = Deno.env.get('GCP_CLIENT_EMAIL')
const GCP_PRIVATE_KEY = Deno.env.get('GCP_PRIVATE_KEY')?.replace(/\\n/g, '\n')

const VERTEX_STREAM_URL = `https://aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/global/publishers/google/models/gemini-3-flash-preview:streamGenerateContent?alt=sse`

const VERTEX_TIMEOUT_MS = 25_000
const AUTH_TIMEOUT_MS = 10_000
const MAX_VERTEX_ATTEMPTS = 3
const RETRY_DELAY_MS = 1000

function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? data : String.fromCharCode(...data)
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: GCP_CLIENT_EMAIL,
    sub: GCP_CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/cloud-platform'
  }

  const encodedHeader = base64UrlEncode(JSON.stringify(header))
  const encodedPayload = base64UrlEncode(JSON.stringify(payload))
  const signatureInput = `${encodedHeader}.${encodedPayload}`

  const keyData = GCP_PRIVATE_KEY!
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')
  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8', binaryKey, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  )
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(signatureInput))
  const encodedSignature = base64UrlEncode(new Uint8Array(signature))

  const jwt = `${signatureInput}.${encodedSignature}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS)

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
      signal: controller.signal
    })
    const tokenData = await tokenResponse.json()
    return tokenData.access_token
  } finally {
    clearTimeout(timeout)
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function logMetrics(
  supabase: any,
  params: {
    clientId: string
    sessionId: string
    widgetId?: string
    responseTimeMs: number
    vertexAttempts: number
    vertexStatus?: number
    success: boolean
    errorType?: string
    errorDetails?: string
  }
) {
  supabase.from('chat_metrics').insert({
    client_id: params.clientId,
    session_id: params.sessionId,
    widget_id: params.widgetId,
    response_time_ms: params.responseTimeMs,
    vertex_attempts: params.vertexAttempts,
    vertex_status: params.vertexStatus,
    success: params.success,
    error_type: params.errorType,
    error_details: params.errorDetails,
  }).then(() => {}).catch(console.error)
}

async function callVertexWithRetry(
  accessToken: string,
  body: object
): Promise<{ response: Response; attempts: number }> {
  let lastError: Error | null = null
  let lastStatus: number | undefined

  for (let attempt = 1; attempt <= MAX_VERTEX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), VERTEX_TIMEOUT_MS)

    try {
      const response = await fetch(VERTEX_STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      clearTimeout(timeout)

      if (response.ok) {
        return { response, attempts: attempt }
      }

      lastStatus = response.status
      const errorText = await response.text()
      lastError = new Error(`Vertex AI ${response.status}: ${errorText}`)
      console.error(`Vertex AI attempt ${attempt} failed:`, response.status, errorText)

      if (response.status < 500 && response.status !== 429) {
        throw Object.assign(lastError, { status: response.status, retryable: false })
      }
    } catch (err: any) {
      clearTimeout(timeout)

      if (err.retryable === false) throw err

      if (err.name === 'AbortError') {
        lastError = new Error('Vertex AI request timed out')
        lastStatus = undefined
        console.error(`Vertex AI attempt ${attempt} timed out`)
      } else if (!lastError) {
        lastError = err
        console.error(`Vertex AI attempt ${attempt} network error:`, err.message)
      }
    }

    if (attempt < MAX_VERTEX_ATTEMPTS) {
      const delay = RETRY_DELAY_MS * attempt
      console.log(`Retrying Vertex AI in ${delay}ms (attempt ${attempt + 1})...`)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw Object.assign(lastError || new Error('Vertex AI failed'), {
    status: lastStatus,
    attempts: MAX_VERTEX_ATTEMPTS
  })
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

  const requestStartTime = Date.now()

  try {
    const { clientId, widgetId, message, sessionId, history, persona, userTime, userTimezone } = await req.json()

    if (!clientId || !message || !sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: clientId, message, sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const contents = (history || []).map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }))

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

    const origin = req.headers.get('origin')
    const allowedOrigins: string[] = client.allowed_origins || []
    if (!origin || !allowedOrigins.includes(origin)) {
      return new Response(
        JSON.stringify({ error: 'Origin not allowed' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (message.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Message too long (max 2000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString()

    const { count: requestCount } = await supabase
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('ip_address', clientIp)
      .gte('created_at', oneMinuteAgo)

    if (requestCount !== null && requestCount >= 30) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    supabase.from('rate_limits').insert({ client_id: clientId, ip_address: clientIp }).then(() => {}).catch(console.error)

    let systemPrompt = client.site_data.systemPrompt
      ? client.site_data.systemPrompt.replace('{{CURRENT_TIME}}', `${userTime || 'Unknown'} (${userTimezone || 'Unknown timezone'})`)
      : buildSystemPrompt(client.site_data, userTime, userTimezone)
    if (persona) {
      systemPrompt = persona + '\n\n' + systemPrompt
    }

    if (client.site_data.menuUrl) {
      try {
        const menuRes = await fetch(client.site_data.menuUrl, {
          signal: AbortSignal.timeout(5000)
        })
        if (menuRes.ok) {
          const menuCookies = await menuRes.json()
          const menuContext = '\n\nCURRENTLY AVAILABLE COOKIES:\n' +
            menuCookies.map((c: any) =>
              `- ${c.name}${c.availability ? ` (${c.availability})` : ''}`
            ).join('\n') +
            '\nUse EXACT names from this list when using the build_box tool.'
          systemPrompt += menuContext
        }
      } catch (e) {
        console.log('Menu fetch failed, using static list:', e)
      }
    }

    let accessToken: string
    try {
      accessToken = await getAccessToken()
      console.log('Access token obtained:', accessToken ? 'yes' : 'no')
    } catch (tokenErr: any) {
      console.error('Token error:', tokenErr)
      const errorType = tokenErr.name === 'AbortError' ? 'timeout' : 'auth_error'
      logMetrics(supabase, {
        clientId, sessionId, widgetId,
        responseTimeMs: Date.now() - requestStartTime,
        vertexAttempts: 0,
        success: false,
        errorType,
        errorDetails: String(tokenErr)
      })
      return new Response(
        JSON.stringify({ error: 'Authentication failed', details: String(tokenErr) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const vertexBody: any = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: contents.length > 0 ? contents : [{ role: 'user', parts: [{ text: message }] }]
    }

    if (client.site_data.tools) {
      vertexBody.tools = client.site_data.tools
      vertexBody.toolConfig = { functionCallingConfig: { mode: "AUTO" } }
    }

    let vertexResponse: Response
    let vertexAttempts: number

    try {
      const result = await callVertexWithRetry(accessToken, vertexBody)
      vertexResponse = result.response
      vertexAttempts = result.attempts
    } catch (err: any) {
      const errorType = err.message?.includes('timed out') ? 'timeout'
        : err.status >= 500 ? 'vertex_5xx'
        : err.status ? `vertex_${err.status}`
        : 'network_error'
      logMetrics(supabase, {
        clientId, sessionId, widgetId,
        responseTimeMs: Date.now() - requestStartTime,
        vertexAttempts: err.attempts || MAX_VERTEX_ATTEMPTS,
        vertexStatus: err.status,
        success: false,
        errorType,
        errorDetails: err.message
      })
      return new Response(
        JSON.stringify({ error: 'AI service unavailable' }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fullReplyParts: string[] = []
    const collectedActions: any[] = []
    const hasTools = !!client.site_data.tools
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        const reader = vertexResponse.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop()!

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const jsonStr = line.slice(6).trim()
              if (!jsonStr || jsonStr === '[DONE]') continue

              try {
                const parsed = JSON.parse(jsonStr)
                if (hasTools) {
                  const parts = parsed.candidates?.[0]?.content?.parts || []
                  for (const part of parts) {
                    if (part.text) {
                      fullReplyParts.push(part.text)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: part.text })}\n\n`))
                    }
                    if (part.functionCall) {
                      collectedActions.push(part.functionCall)
                    }
                  }
                } else {
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                  if (text) {
                    fullReplyParts.push(text)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                  }
                }
              } catch {
                // skip malformed SSE chunks
              }
            }
          }

          // Process any remaining buffer
          if (buffer.startsWith('data: ')) {
            const jsonStr = buffer.slice(6).trim()
            if (jsonStr && jsonStr !== '[DONE]') {
              try {
                const parsed = JSON.parse(jsonStr)
                if (hasTools) {
                  const parts = parsed.candidates?.[0]?.content?.parts || []
                  for (const part of parts) {
                    if (part.text) {
                      fullReplyParts.push(part.text)
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: part.text })}\n\n`))
                    }
                    if (part.functionCall) {
                      collectedActions.push(part.functionCall)
                    }
                  }
                } else {
                  const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text
                  if (text) {
                    fullReplyParts.push(text)
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
                  }
                }
              } catch {
                // skip
              }
            }
          }

          for (const action of collectedActions) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({
              action: { type: action.name, ...action.args }
            })}\n\n`))
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          const fullReply = fullReplyParts.join('')
            + (collectedActions.length > 0 ? '\n[Built a 4-pack box]' : '')
          supabase.from('chat_logs').insert([
            { client_id: clientId, session_id: sessionId, widget_id: widgetId, role: 'user', message, origin },
            { client_id: clientId, session_id: sessionId, widget_id: widgetId, role: 'assistant', message: fullReply, origin }
          ]).then(() => {}).catch(console.error)

          logMetrics(supabase, {
            clientId, sessionId, widgetId,
            responseTimeMs: Date.now() - requestStartTime,
            vertexAttempts,
            vertexStatus: vertexResponse.status,
            success: true
          })
        } catch (streamErr) {
          console.error('Stream processing error:', streamErr)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`))
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()

          logMetrics(supabase, {
            clientId, sessionId, widgetId,
            responseTimeMs: Date.now() - requestStartTime,
            vertexAttempts,
            vertexStatus: vertexResponse.status,
            success: false,
            errorType: 'stream_error',
            errorDetails: String(streamErr)
          })
        }
      }
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      }
    })

  } catch (err) {
    console.error('Edge function error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildSystemPrompt(siteData: any, userTime?: string, userTimezone?: string): string {
  const { business, pages, services, staff, faqs, appointmentInfo, callToAction, emergencyAction } = siteData

  let prompt = `You are a friendly, casual assistant for ${business.name}. ${business.description}

CURRENT TIME: ${userTime || 'Unknown'} (${userTimezone || 'Unknown timezone'})

TONE & STYLE:
- Be conversational and warm, like texting with a helpful friend
- Keep responses SHORT - 1-2 sentences max unless they ask for details
- Don't use em dashes (—) - use commas, periods, or just break into separate sentences
- Use casual language ("Yeah!", "Sure thing!", "Happy to help!")
- Include a relevant link when it makes sense, always using Markdown format: [Link Text](URL)
- Keep the conversation going - ask follow-up questions, show interest
- When sharing a link, invite them to come back and chat more afterward

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

  if (emergencyAction) {
    if (emergencyAction.emergencyFacilities && emergencyAction.severityLevels) {
      const { triageGuidance, severityLevels, emergencyFacilities } = emergencyAction
      const { critical, moderate, minor } = severityLevels

      prompt += `\nEMERGENCY TRIAGE (HIGHEST PRIORITY):
${triageGuidance || 'Use your knowledge to assess the severity of the situation.'}

SEVERITY LEVELS:
- CRITICAL: ${critical.description}. Examples: ${critical.examples.join(', ')}. Action: ${critical.instruction}
- MODERATE: ${moderate.description}. Examples: ${moderate.examples.join(', ')}. Action: ${moderate.instruction}
- MINOR: ${minor.description}. Examples: ${minor.examples.join(', ')}. Action: ${minor.instruction}

EMERGENCY FACILITIES (USE ONLY THESE - DO NOT MAKE UP ADDRESSES OR PHONE NUMBERS):
${emergencyFacilities.map((f: any) => `- ${f.name} (${f.location}): ${f.phone}, ${f.address}, Hours: ${f.hours}`).join('\n')}

IMPORTANT:
- You MUST use ONLY the exact names, phone numbers, and addresses listed above. Never invent or guess facility information.
- Check the CURRENT TIME above and recommend facilities that are OPEN NOW. If a facility is closed, mention that and suggest an open alternative (prefer 24/7 facilities for after-hours emergencies).
- If asked about a location not covered, say you don't have specific facility information for that area.
- Take emergencies seriously but stay calm and reassuring.
- After directing them to emergency care, invite them to chat again once their pet is stable.\n`
    } else {
      prompt += `\nEMERGENCY TRIAGE (HIGHEST PRIORITY):
${emergencyAction.triggers}
If you detect an emergency: ${emergencyAction.message}
Referral: ${emergencyAction.referral}
- Take emergencies seriously but stay calm and reassuring
- After directing them to emergency care, invite them to chat again once their pet is stable\n`
    }
  }

  if (callToAction) {
    prompt += `\nCALL TO ACTION (for non-emergencies):
When the conversation naturally concludes, the user seems satisfied, says goodbye, or their question has been fully answered, gently suggest they ${callToAction.text}: ${callToAction.url}
${callToAction.context ? callToAction.context : ''}
- Don't force it into every response
- Make it feel like a natural next step, not a sales pitch
- Only mention it once per conversation when appropriate
- After sharing the link, invite them to come back if they have more questions\n`
  }

  return prompt
}
