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
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2 min-h-[24px]">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-secondary text-foreground px-2 py-0.5 text-xs font-mono"
            >
              {tag}
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
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
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
        placeholder={placeholder}
      />
      <p className="text-xs text-muted-foreground font-mono mt-1">{hint}</p>
    </div>
  )
}

const labelClass = "block text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5"

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

  const inputClass = "w-full border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>Voice / Writing Style</label>
        <textarea
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Describe the writing voice, e.g.: Warm and insightful, uses analogies and everyday scenarios to explain concepts"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">How the AI should sound</p>
          <p className="text-xs text-muted-foreground font-mono">{voice.length}</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Target Audience</label>
        <textarea
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          rows={3}
          className={inputClass}
          placeholder="Describe your audience, e.g.: 25-35 year old tech professionals interested in AI and productivity"
        />
        <div className="flex justify-between mt-1">
          <p className="text-xs text-muted-foreground">Who the articles are written for</p>
          <p className="text-xs text-muted-foreground font-mono">{audience.length}</p>
        </div>
      </div>

      <div>
        <label className={labelClass}>Tone</label>
        <select
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          className="w-full border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="formal">Formal</option>
          <option value="casual">Casual</option>
          <option value="mixed">Mixed</option>
        </select>
      </div>

      <TagInput
        value={includeTags}
        onChange={setIncludeTags}
        placeholder="Type a topic, e.g.: AI, productivity, tech trends"
        hint="Topics to focus on (comma-separated)"
      />

      <TagInput
        value={excludeTags}
        onChange={setExcludeTags}
        placeholder="Type a topic, e.g.: politics, controversy"
        hint="Topics to avoid (comma-separated)"
      />

      {error && <div className="text-destructive text-xs font-mono">{error}</div>}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Saving..." : "Save Brief"}
      </button>
    </form>
  )
}
