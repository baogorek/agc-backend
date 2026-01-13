import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { createClient } from '@supabase/supabase-js'
import { generateContent, buildApiRequest, type ModelType, type Message } from './vertex.js'
import { buildSystemPrompt } from './prompt-builder.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

app.get('/api/clients', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('id, name, active')
    .order('name')

  if (error) {
    return res.status(500).json({ error: error.message })
  }
  res.json(data)
})

app.get('/api/clients/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', req.params.id)
    .single()

  if (error) {
    return res.status(404).json({ error: 'Client not found' })
  }
  res.json(data)
})

app.get('/api/prompt/:clientId', async (req, res) => {
  const { data: client, error } = await supabase
    .from('clients')
    .select('site_data')
    .eq('id', req.params.clientId)
    .single()

  if (error || !client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const systemPrompt = buildSystemPrompt(client.site_data)
  res.json({ systemPrompt })
})

app.post('/api/chat', async (req, res) => {
  const { clientId, message, model, conversationHistory } = req.body as {
    clientId: string
    message: string
    model: ModelType
    conversationHistory?: Message[]
  }

  if (!clientId || !message || !model) {
    return res.status(400).json({ error: 'Missing required fields: clientId, message, model' })
  }

  const { data: client, error } = await supabase
    .from('clients')
    .select('site_data')
    .eq('id', clientId)
    .single()

  if (error || !client) {
    return res.status(404).json({ error: 'Client not found' })
  }

  const systemPrompt = buildSystemPrompt(client.site_data)
  const apiRequest = buildApiRequest({
    systemPrompt,
    userMessage: message,
    conversationHistory
  })

  try {
    const response = await generateContent({
      model,
      systemPrompt,
      userMessage: message,
      conversationHistory
    })

    res.json({
      ...response,
      systemPrompt,
      apiRequest
    })
  } catch (err) {
    console.error('Chat error:', err)
    res.status(500).json({ error: err instanceof Error ? err.message : 'Unknown error' })
  }
})

app.listen(PORT, () => {
  console.log(`Dev Studio server running at http://localhost:${PORT}`)
})
