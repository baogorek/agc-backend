import { useState } from 'react'

interface Props {
  systemPrompt: string
  apiRequest?: object
}

export default function PromptViewer({ systemPrompt, apiRequest }: Props) {
  const [activeSection, setActiveSection] = useState<'prompt' | 'request' | null>(null)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  const toggleSection = (section: 'prompt' | 'request') => {
    setActiveSection(activeSection === section ? null : section)
  }

  return (
    <div className="space-y-2">
      <div>
        <button
          onClick={() => toggleSection('prompt')}
          className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white"
        >
          <span className={`transform transition-transform ${activeSection === 'prompt' ? 'rotate-90' : ''}`}>
            ▶
          </span>
          System Prompt
        </button>
        {activeSection === 'prompt' && (
          <div className="mt-2 relative">
            <button
              onClick={() => copyToClipboard(systemPrompt)}
              className="absolute top-2 right-2 z-10 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              Copy
            </button>
            <pre className="bg-gray-800 border border-gray-700 rounded p-4 text-sm text-gray-300 whitespace-pre-wrap overflow-auto max-h-[50vh]">
              {systemPrompt || 'Select a client to view the prompt'}
            </pre>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => toggleSection('request')}
          className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white"
        >
          <span className={`transform transition-transform ${activeSection === 'request' ? 'rotate-90' : ''}`}>
            ▶
          </span>
          API Request JSON
        </button>
        {activeSection === 'request' && (
          <div className="mt-2 relative">
            <button
              onClick={() => copyToClipboard(JSON.stringify(apiRequest, null, 2))}
              className="absolute top-2 right-2 z-10 text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
            >
              Copy
            </button>
            <pre className="bg-gray-800 border border-gray-700 rounded p-4 text-sm text-green-400 whitespace-pre-wrap overflow-auto max-h-[50vh]">
              {apiRequest ? JSON.stringify(apiRequest, null, 2) : 'Send a message to see the API request'}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
