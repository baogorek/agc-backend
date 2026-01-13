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
}

export function buildSystemPrompt(siteData: SiteData): string {
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

  return prompt
}
