'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { InteractionRequest, InteractionType } from '@/lib/types/step-execution'

interface InteractionPanelProps {
  interaction: InteractionRequest
  onSubmit: (input: { type: InteractionType; value: string | boolean | string[] }) => void
}

export function InteractionPanel({ interaction, onSubmit }: InteractionPanelProps) {
  const [input, setInput] = useState<string>("")
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const handleSubmit = () => {
    if (interaction.type === 'select') {
      onSubmit({ type: 'select', value: input })
    } else if (interaction.type === 'input') {
      onSubmit({ type: 'input', value: input })
    } else if (interaction.type === 'confirm') {
      onSubmit({ type: 'confirm', value: true })
    } else if (interaction.type === 'multiselect') {
      onSubmit({ type: 'multiselect', value: selectedOptions })
    }
  }

  const handleCancel = () => {
    if (interaction.type === 'confirm') {
      onSubmit({ type: 'confirm', value: false })
    } else {
      setInput("")
      setSelectedOptions([])
    }
  }

  const toggleOption = (value: string) => {
    setSelectedOptions((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    )
  }

  return (
    <Card className="border-yellow-400 bg-yellow-50">
      <CardHeader>
        <CardTitle className="text-yellow-800">User Input Required</CardTitle>
        <CardDescription>
          Step {interaction.stepId}: {interaction.stepName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="font-medium">{interaction.message}</p>

        {interaction.type === 'select' && interaction.options?.choices && (
          <select
            className="w-full rounded-md border bg-background px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          >
            <option value="">Select an option...</option>
            {interaction.options.choices.map((choice) => (
              <option key={choice.value} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        )}

        {interaction.type === 'input' && (
          <input
            type="text"
            className="w-full rounded-md border bg-background px-3 py-2"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={interaction.options?.placeholder}
          />
        )}

        {interaction.type === 'confirm' && (
          <p className="text-sm text-muted-foreground">
            Please confirm to continue or cancel to abort.
          </p>
        )}

        {interaction.type === 'multiselect' && interaction.options?.choices && (
          <div className="space-y-2">
            {interaction.options.choices.map((choice) => (
              <label key={choice.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(choice.value)}
                  onChange={() => toggleOption(choice.value)}
                  className="rounded border-gray-300"
                />
                <span>{choice.label}</span>
              </label>
            ))}
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {interaction.type === 'confirm' ? 'Confirm' : 'Submit'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default InteractionPanel
