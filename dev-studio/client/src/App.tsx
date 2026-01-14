import { useState, useEffect } from 'react'
import ClientSelector from './components/ClientSelector'
import ModelSelector from './components/ModelSelector'
import PromptViewer from './components/PromptViewer'
import ChatInterface from './components/ChatInterface'
import DebugPanel from './components/DebugPanel'

export type ModelType = 'gemini-3-flash-preview' | 'gemini-2.0-flash'

export interface Client {
  id: string
  name: string
  active: boolean
}

export interface Message {
  role: 'user' | 'model'
  content: string
}

export interface DebugInfo {
  latencyMs: number
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  rawResponse?: object
  apiRequest?: object
}

export default function App() {
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  const [model, setModel] = useState<ModelType>(() => {
    return (localStorage.getItem('devStudioModel') as ModelType) || 'gemini-3-flash-preview'
  })
  const [systemPrompt, setSystemPrompt] = useState<string>('')
  const [messages, setMessages] = useState<Message[]>([])
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (selectedClientId) {
      fetch(`/api/prompt/${selectedClientId}`)
        .then(res => res.json())
        .then(data => setSystemPrompt(data.systemPrompt))
        .catch(console.error)
      setMessages([])
      setDebugInfo(null)
    }
  }, [selectedClientId])

  useEffect(() => {
    localStorage.setItem('devStudioModel', model)
  }, [model])

  const handleSendMessage = async (text: string) => {
    if (!selectedClientId || !text.trim()) return

    const userMessage: Message = { role: 'user', content: text }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: selectedClientId,
          message: text,
          model,
          conversationHistory: messages
        })
      })

      const data = await res.json()

      if (res.ok) {
        const botMessage: Message = { role: 'model', content: data.reply }
        setMessages(prev => [...prev, botMessage])
        setDebugInfo({
          latencyMs: data.latencyMs,
          usageMetadata: data.usageMetadata,
          rawResponse: data.rawResponse,
          apiRequest: data.apiRequest
        })
      } else {
        const errorMessage: Message = { role: 'model', content: `Error: ${data.error}` }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (err) {
      const errorMessage: Message = { role: 'model', content: `Error: ${err}` }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    setMessages([])
    setDebugInfo(null)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      <header className="flex-none bg-gray-800 border-b border-gray-700 px-6 py-3">
        <h1 className="text-xl font-bold text-blue-400">AGC Dev Studio</h1>
      </header>

      <div className="flex-none px-6 py-3 bg-gray-800 border-b border-gray-700 flex flex-wrap gap-4 items-center">
        <ClientSelector
          clients={clients}
          selectedClientId={selectedClientId}
          onSelect={setSelectedClientId}
        />
        <ModelSelector model={model} onSelect={setModel} />
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded"
          >
            Clear Chat
          </button>
        )}
      </div>

      <div className="flex-1 flex min-h-0">
        <div className="w-1/2 border-r border-gray-700 overflow-auto p-4">
          <PromptViewer
            systemPrompt={systemPrompt}
            apiRequest={debugInfo?.apiRequest}
          />
        </div>
        <div className="w-1/2 flex flex-col min-h-0">
          <ChatInterface
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            disabled={!selectedClientId}
          />
        </div>
      </div>

      <DebugPanel debugInfo={debugInfo} model={model} />
    </div>
  )
}
