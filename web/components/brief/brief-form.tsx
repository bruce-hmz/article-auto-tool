"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"

interface BriefData {
  voice?: string
  audience?: string
  tone?: string
  topicDomains?: { include: string[]; exclude: string[] }
  promptOverrides?: Record<string, unknown>
}

interface BriefFormProps {
  brief: BriefData | null
  onSubmit: (data: BriefData) => Promise<void>
  loading: boolean
}

function TagInput({
  value,
  onChange,
  placeholder,
  hint,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  hint: string
}) {
  const tags = value.split(",").map((s) => s.trim()).filter(Boolean)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-1.5 min-h-[28px]">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
          >
            {tag}
            <button
              type="button"
              className="hover:text-destructive"
              onClick={() => {
                const newTags = tags.filter((_, j) => j !== i)
                onChange(newTags.join(", "))
              }}
            >
              &times;
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  )
}

export function BriefForm({ brief, onSubmit, loading }: BriefFormProps) {
  const [voice, setVoice] = useState(brief?.voice ?? "")
  const [audience, setAudience] = useState(brief?.audience ?? "")
  const [tone, setTone] = useState(brief?.tone ?? "mixed")
  const [includeTags, setIncludeTags] = useState(brief?.topicDomains?.include?.join(", ") ?? "")
  const [excludeTags, setExcludeTags] = useState(brief?.topicDomains?.exclude?.join(", ") ?? "")
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const data: BriefData = {}

    if (voice.trim()) data.voice = voice.trim()
    if (audience.trim()) data.audience = audience.trim()
    if (tone) data.tone = tone

    const include = includeTags.split(",").map(s => s.trim()).filter(Boolean)
    const exclude = excludeTags.split(",").map(s => s.trim()).filter(Boolean)
    if (include.length > 0 || exclude.length > 0) {
      data.topicDomains = { include, exclude }
    }

    try {
      await onSubmit(data)
    } catch {
      setError("Failed to save brief")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium mb-1">Voice / Writing Style</label>
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe the writing voice, e.g.: Warm and insightful, uses analogies and everyday scenarios to explain concepts"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">How the AI should sound when writing articles</p>
          <p className="text-xs text-muted-foreground">{voice.length} chars</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Target Audience</label>
        <textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          rows={3}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe your audience, e.g.: 25-35 year old tech professionals interested in AI and productivity"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">Who the articles are written for</p>
          <p className="text-xs text-muted-foreground">{audience.length} chars</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Tone</label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="mixed">Mixed</option>
        </select>
        <p className="text-xs text-muted-foreground mt-1">Overall tone of the articles</p>
      </div>

      <TagInput
        value={includeTags}
        onChange={setIncludeTags}
        placeholder="Type a topic and press Enter, e.g.: AI, productivity, tech trends"
        hint="Topics this account should focus on (comma-separated)"
      />

      <TagInput
        value={excludeTags}
        onChange={setExcludeTags}
        placeholder="Type a topic and press Enter, e.g.: politics, controversy"
        hint="Topics this account should avoid (comma-separated)"
      />

      {error && <div className="text-red-500 text-sm">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Saving..." : "Save Editorial Brief"}
      </button>
    </form>
  )
}
