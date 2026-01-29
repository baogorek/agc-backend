// NOTE: buildSystemPrompt must stay in sync with supabase/functions/chat/index.ts
export interface SiteData {
  business: {
    name: string
    description: string
    phone: string
    email: string
    hours: string
    serviceArea: string
  }
  pages?: Record<string, string>
  services?: Array<{ name: string; description: string }>
  staff?: Array<{
    name: string
    credentials: string
    role?: string
    specialties?: string
  }>
  faqs?: Array<{ question: string; answer: string }>
  appointmentInfo?: {
    scheduling: string
    windows: string
    deposit: string
    emergency: string
  }
  callToAction?: {
    text: string
    url: string
    context?: string
  }
  emergencyAction?: {
    // Legacy format
    triggers?: string
    referral?: string
    message?: string
    // New structured format
    triageGuidance?: string
    severityLevels?: {
      critical: { description: string; examples: string[]; instruction: string }
      moderate: { description: string; examples: string[]; instruction: string }
      minor: { description: string; examples: string[]; instruction: string }
    }
    emergencyFacilities?: Array<{
      name: string
      location: string
      phone: string
      address: string
      hours: string
    }>
  }
  widgetConfig?: Record<string, {
    bubbleImage?: string
    brandColor?: string
    greeting?: string
    persona?: string
    position?: 'left' | 'right'
    bottomOffset?: number
    horizontalMargin?: number
  }>
}

export function buildSystemPrompt(siteData: SiteData): string {
  const { business, pages, services, staff, faqs, appointmentInfo, callToAction, emergencyAction } = siteData

  let prompt = `You are a friendly, casual assistant for ${business.name}. ${business.description}

TONE & STYLE:
- Be conversational and warm, like texting with a helpful friend
- Keep responses SHORT - 1-2 sentences max unless they ask for details
- Use casual language ("Yeah!", "Sure thing!", "Happy to help!")
- Include a relevant link when it makes sense
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
    services.forEach((s) => {
      prompt += `- ${s.name}: ${s.description}\n`
    })
  }

  if (staff && staff.length > 0) {
    prompt += `\nSTAFF:\n`
    staff.forEach((s) => {
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

  if (faqs && faqs.length > 0) {
    prompt += `\nCOMMON QUESTIONS:\n`
    faqs.forEach((f) => {
      prompt += `Q: ${f.question}\nA: ${f.answer}\n\n`
    })
  }

  if (emergencyAction) {
    // Support new structured format with emergencyFacilities array
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
${emergencyFacilities.map((f) => `- ${f.name} (${f.location}): ${f.phone}, ${f.address}, Hours: ${f.hours}`).join('\n')}

IMPORTANT: When referring to emergency facilities, you MUST use ONLY the exact names, phone numbers, and addresses listed above. Never invent or guess facility information. If asked about a location not covered, say you don't have specific facility information for that area.
- Take emergencies seriously but stay calm and reassuring
- After directing them to emergency care, invite them to chat again once their pet is stable\n`
    } else if (emergencyAction.triggers) {
      // Legacy format support
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
