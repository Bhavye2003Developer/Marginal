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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
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
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          placeholder="Paste a URL to save…"
          className="input"
          style={{ flex: 1, fontSize: 14, padding: "10px 16px", borderRadius: 10 }}
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={saving || !url.trim()}
          className="btn-primary"
          style={{ padding: "10px 22px", borderRadius: 10, fontSize: 14 }}
        >
          {saving ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
              Saving
            </span>
          ) : success ? "✓ Saved" : "Save"}
        </button>
      </form>
      {error && (
        <p style={{ marginTop: 8, fontSize: 13, color: "#E5534B", display: "flex", alignItems: "center", gap: 6 }}>
          <span>⚠</span> {error}
        </p>
      )}
    </div>
  );
}
