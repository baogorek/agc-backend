// NOTE: Model and endpoint must stay in sync with supabase/functions/chat/index.ts
import 'dotenv/config'

const GCP_PROJECT_ID = process.env.GCP_PROJECT_ID
const GCP_CLIENT_EMAIL = process.env.GCP_CLIENT_EMAIL
const GCP_PRIVATE_KEY = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n')
const VERTEX_REGION = 'us-central1'

export type ModelType = 'gemini-3-flash-preview' | 'gemini-2.0-flash'

export interface Message {
  role: 'user' | 'model'
  content: string
}

export interface ChatResponse {
  reply: string
  latencyMs: number
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  rawResponse: object
}

function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? data : String.fromCharCode(...data)
  return Buffer.from(str, 'binary').toString('base64')
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function getAccessToken(): Promise<string> {
  const crypto = await import('crypto')
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

  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signatureInput)
  const signature = sign.sign(GCP_PRIVATE_KEY!, 'base64')
  const encodedSignature = signature.replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signatureInput}.${encodedSignature}`

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
  })
  const tokenData = await tokenResponse.json()
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`)
  }
  return tokenData.access_token
}

export async function generateContent(options: {
  model: ModelType
  systemPrompt: string
  userMessage: string
  conversationHistory?: Message[]
}): Promise<ChatResponse> {
  const { model, systemPrompt, userMessage, conversationHistory = [] } = options

  const vertexUrl = `https://aiplatform.googleapis.com/v1/projects/${GCP_PROJECT_ID}/locations/global/publishers/google/models/${model}:generateContent`

  const accessToken = await getAccessToken()

  const contents = [
    ...conversationHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    })),
    { role: 'user', parts: [{ text: userMessage }] }
  ]

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents
  }

  const startTime = Date.now()
  const vertexResponse = await fetch(vertexUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    },
    body: JSON.stringify(requestBody)
  })
  const latencyMs = Date.now() - startTime

  if (!vertexResponse.ok) {
    const errorText = await vertexResponse.text()
    throw new Error(`Vertex AI error (${vertexResponse.status}): ${errorText}`)
  }

  const geminiData = await vertexResponse.json()
  const reply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
    'Sorry, I could not get a response. Please try again.'

  return {
    reply,
    latencyMs,
    usageMetadata: geminiData.usageMetadata,
    rawResponse: geminiData
  }
}

export function buildApiRequest(options: {
  systemPrompt: string
  userMessage: string
  conversationHistory?: Message[]
}) {
  const { systemPrompt, userMessage, conversationHistory = [] } = options
  return {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [
      ...conversationHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.content }]
      })),
      { role: 'user', parts: [{ text: userMessage }] }
    ]
  }
}
