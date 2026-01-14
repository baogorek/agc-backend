import { useState } from 'react'

interface DebugInfo {
  latencyMs: number
  usageMetadata?: {
    promptTokenCount?: number
    candidatesTokenCount?: number
    totalTokenCount?: number
  }
  rawResponse?: object
}

type ModelType = 'gemini-3-flash-preview' | 'gemini-2.0-flash'

interface Props {
  debugInfo: DebugInfo | null
  model: ModelType
}

export default function DebugPanel({ debugInfo, model }: Props) {
  const [showRaw, setShowRaw] = useState(false)

  if (!debugInfo) {
    return (
      <footer className="flex-none bg-gray-800 border-t border-gray-700 px-6 py-3 text-sm text-gray-400">
        Debug: No response yet
      </footer>
    )
  }

  const { latencyMs, usageMetadata } = debugInfo

  return (
    <footer className="flex-none bg-gray-800 border-t border-gray-700 px-6 py-3">
      <div className="flex items-center gap-6 text-sm">
        <span className="text-gray-400">
          <span className="text-gray-500">Latency:</span>{' '}
          <span className="text-yellow-400">{(latencyMs / 1000).toFixed(2)}s</span>
        </span>
        {usageMetadata && (
          <span className="text-gray-400">
            <span className="text-gray-500">Tokens:</span>{' '}
            <span className="text-green-400">{usageMetadata.promptTokenCount || 0} in</span>
            {' / '}
            <span className="text-blue-400">{usageMetadata.candidatesTokenCount || 0} out</span>
          </span>
        )}
        <span className="text-gray-400">
          <span className="text-gray-500">Model:</span>{' '}
          <span className="text-purple-400">{model}</span>
        </span>
        <button
          onClick={() => setShowRaw(!showRaw)}
          className="text-gray-400 hover:text-white text-xs ml-auto"
        >
          {showRaw ? 'Hide' : 'Show'} Raw Response
        </button>
      </div>

      {showRaw && debugInfo.rawResponse && (
        <pre className="mt-3 bg-gray-900 border border-gray-700 rounded p-3 text-xs text-gray-300 overflow-auto max-h-[200px]">
          {JSON.stringify(debugInfo.rawResponse, null, 2)}
        </pre>
      )}
    </footer>
  )
}
