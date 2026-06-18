"use client";

import { useState } from "react";

const stats = [
  { label: "Ingest", value: "Upload" },
  { label: "Index", value: "Embed" },
  { label: "Answer", value: "Chat" },
];

export default function HomePage() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [chatting, setChatting] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("Upload once, then keep asking.");
  const [error, setError] = useState("");

  async function handleUpload(event) {
    event.preventDefault();
    if (!file) return;

    setUploading(true);
    setError("");
    setStatus("Uploading and indexing document...");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");

      setStatus("Saved and indexed in Supabase.");
      setFile(null);
    } catch (err) {
      setError(err.message);
      setStatus("Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleChat(event) {
    event.preventDefault();
    if (!question.trim()) return;

    setChatting(true);
    setError("");
    setAnswer("");
    setSources([]);
    setStatus("Searching your documents...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Chat request failed");

      setAnswer(data.answer);
      setSources(data.sources || []);
      setStatus("Answer ready.");
    } catch (err) {
      setError(err.message);
      setStatus("Chat failed.");
    } finally {
      setChatting(false);
    }
  }

  return (
    <main className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <div className="ambient ambient-three" />

      <section className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark">ED</div>
          <div>
            <p className="eyebrow">Enterprise AI workspace</p>
            <h1>Enterprise AI workspace</h1>
          </div>
        </div>
      </section>

      <section className="hero-grid">
        <article className="hero-panel card glass">
          <div className="hero-copy">
            <p className="section-label">Knowledge assistant</p>
            <h2>Ask questions from company documents with grounded answers.</h2>
            <p className="lede">
              Upload policies, manuals, and internal docs. We extract text,
              chunk it, embed it in Supabase, and let OpenAI answer only from
              the most relevant passages.
            </p>
          </div>

          <div className="stats-row">
            {stats.map((stat) => (
              <div key={stat.label} className="stat-card">
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="hero-aside card dark-card">
          <p className="section-label inverted">Today’s flow</p>
          <ol className="flow-list">
            <li>
              <strong>Upload</strong>
              <span>Send a PDF, DOCX, TXT, or Markdown file.</span>
            </li>
            <li>
              <strong>Index</strong>
              <span>Chunks get embedded and saved in Supabase.</span>
            </li>
            <li>
              <strong>Chat</strong>
              <span>Ask questions and get answers with sources.</span>
            </li>
          </ol>
        </aside>
      </section>

      <section className="control-grid">
        <article className="card control-card">
          <div className="card-head">
            <div>
              <p className="section-label">Ingest</p>
              <h3>1. Upload a document</h3>
            </div>
            <span className="mini-badge">Storage + embeddings</span>
          </div>
          <p className="muted">
            The backend extracts text, creates embeddings, and stores chunks in
            Supabase.
          </p>
          <form onSubmit={handleUpload} className="stack">
            <label className="file-dropzone">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept=".pdf,.docx,.txt,.md"
              />
              <div>
                <strong>{file ? file.name : "Drop a file or browse"}</strong>
                <span>PDF, DOCX, TXT, Markdown</span>
              </div>
            </label>
            <button type="submit" disabled={!file || uploading}>
              {uploading ? "Uploading..." : "Upload and index"}
            </button>
          </form>
        </article>

        <article className="card control-card">
          <div className="card-head">
            <div>
              <p className="section-label">Chat</p>
              <h3>2. Ask a question</h3>
            </div>
            <span className="mini-badge">Retrieval + answer</span>
          </div>
          <p className="muted">
            Your question is embedded, matched against the vector store, and
            then passed to OpenAI with the best stored document context. You do
            not need to upload again for every question.
          </p>
          <p className="selected-note">
            Chat uses the saved document in Supabase behind the scenes.
          </p>
          <form onSubmit={handleChat} className="stack">
            <textarea
              rows={6}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What does our policy say about customer data retention?"
            />
            <button type="submit" disabled={!question.trim() || chatting}>
              {chatting ? "Thinking..." : "Ask"}
            </button>
          </form>
        </article>
      </section>

      <section className="lower-grid">
        <article className="card status-card">
          <div className="card-head">
            <div>
              <p className="section-label">System</p>
              <h3>Status</h3>
            </div>
          </div>
          <p>{status}</p>
          {error ? <p className="error">{error}</p> : null}
        </article>

        <article className="card answer-card">
          <div className="card-head">
            <div>
              <p className="section-label">Response</p>
              <h3>Answer</h3>
            </div>
          </div>
          <div className="answer-shell">
            <p className="answer">
              {answer || "Your answer will appear here after you ask a question."}
            </p>
          </div>

          {sources.length > 0 ? (
            <div className="sources-wrap">
              <h4>Sources</h4>
              <ul className="sources">
                {sources.map((source, index) => (
                  <li key={`${source.document_id}-${index}`}>
                    <div className="source-meta">
                      <strong>Source {index + 1}</strong>
                      <span>{Math.round((source.similarity ?? 0) * 100)}% match</span>
                    </div>
                    <p>{source.content}</p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </article>
      </section>
    </main>
  );
}
