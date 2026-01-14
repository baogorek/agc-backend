interface Client {
  id: string
  name: string
  active: boolean
}

interface Props {
  clients: Client[]
  selectedClientId: string
  onSelect: (id: string) => void
}

export default function ClientSelector({ clients, selectedClientId, onSelect }: Props) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-400">Client:</label>
      <select
        value={selectedClientId}
        onChange={e => onSelect(e.target.value)}
        className="bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm min-w-[200px]"
      >
        <option value="">Select a client...</option>
        {clients.map(client => (
          <option key={client.id} value={client.id}>
            {client.name} ({client.id}) {!client.active && '[inactive]'}
          </option>
        ))}
      </select>
    </div>
  )
}
