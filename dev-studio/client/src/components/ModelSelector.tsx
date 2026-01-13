type ModelType = 'gemini-3-flash-preview' | 'gemini-2.0-flash'

interface Props {
  model: ModelType
  onSelect: (model: ModelType) => void
}

export default function ModelSelector({ model, onSelect }: Props) {
  return (
    <div className="flex items-center gap-4">
      <label className="text-sm text-gray-400">Model:</label>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="model"
            value="gemini-3-flash-preview"
            checked={model === 'gemini-3-flash-preview'}
            onChange={() => onSelect('gemini-3-flash-preview')}
            className="text-blue-500"
          />
          <span className="text-sm">3 Flash</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="model"
            value="gemini-2.0-flash"
            checked={model === 'gemini-2.0-flash'}
            onChange={() => onSelect('gemini-2.0-flash')}
            className="text-blue-500"
          />
          <span className="text-sm">2.0 Flash</span>
        </label>
      </div>
    </div>
  )
}
