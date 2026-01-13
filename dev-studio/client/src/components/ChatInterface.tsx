import { useState, useRef, useEffect } from 'react'

interface Message {
  role: 'user' | 'model'
  content: string
}

interface Props {
  messages: Message[]
  isLoading: boolean
  onSendMessage: (text: string) => void
  disabled: boolean
}

export default function ChatInterface({ messages, isLoading, onSendMessage, disabled }: Props) {
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim() && !isLoading && !disabled) {
      onSendMessage(input.trim())
      setInput('')
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            {disabled ? 'Select a client to start chatting' : 'Send a message to start the conversation'}
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-100'
              }`}
            >
              <div className="text-xs text-gray-400 mb-1">
                {msg.role === 'user' ? 'You' : 'Bot'}
              </div>
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 rounded-lg px-4 py-2 text-gray-400">
              Typing...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={disabled ? 'Select a client first' : 'Type a message...'}
            disabled={disabled || isLoading}
            className="flex-1 bg-gray-700 border border-gray-600 rounded px-4 py-2 text-white placeholder-gray-400 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={disabled || isLoading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded font-medium"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  )
}
