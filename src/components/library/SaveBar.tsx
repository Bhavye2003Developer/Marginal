"use client";
import { useState } from "react";

interface Props {
  onSaved: () => void;
}

export default function SaveBar({ onSaved }: Props) {
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || saving) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch("/api/articles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Save failed");
      setUrl("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="Paste a URL to save…"
          className="input flex-1 text-[14px]"
          style={{ padding: "10px 16px", borderRadius: 10, fontSize: 14 }}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="btn-primary"
          style={{ padding: "10px 20px", borderRadius: 10, fontSize: 14 }}
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Saving
            </span>
          ) : success ? "✓ Saved" : "Save"}
        </button>
      </form>
      {error && (
        <p className="mt-2 text-[13px] text-red-600 flex items-center gap-1.5">
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
