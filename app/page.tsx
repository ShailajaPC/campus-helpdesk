"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type HelpRequest = {
  id: number;
  student_name: string;
  message: string;
  created_at: string;
};

export default function Home() {
  const [studentName, setStudentName] = useState("");
  const [message, setMessage] = useState("");
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [source, setSource] = useState<"Redis" | "PostgreSQL" | "Loading">("Loading");
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const viewsCounted = useRef(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/requests", { cache: "no-store" });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Unable to load requests.");
      }

      setRequests(data.requests);
      setSource(data.source);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load requests.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRequests();

    // React Strict Mode can re-run effects in development. This ref avoids
    // counting that development-only effect replay as another page view.
    if (!viewsCounted.current) {
      viewsCounted.current = true;
      fetch("/api/views")
        .then((response) => response.json())
        .then((data) => {
          if (data.success) setViews(data.views);
        })
        .catch(() => setViews(null));
    }
  }, [loadRequests]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanName = studentName.trim();
    const cleanMessage = message.trim();

    if (!cleanName || !cleanMessage) {
      setError("Please enter both your name and help request.");
      return;
    }

    setPosting(true);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_name: cleanName,
          message: cleanMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Could not post your request.");
      }

      setStudentName("");
      setMessage("");
      setNotice(`Your request was posted successfully (ID: ${data.id}).`);
      await loadRequests();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not post your request.");
    } finally {
      setPosting(false);
    }
  }

  return (
    <main className="page-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Campus Help Desk home">
          <span className="brand-mark">?</span>
          <span>Campus Help Desk</span>
        </a>
        <span className="topbar-caption">Student community support</span>
      </header>

      <section className="hero">
        <p className="eyebrow">CAMPUS COMMUNITY</p>
        <h1>Questions are better<br />when shared.</h1>
        <p className="hero-copy">
          Ask a question, share what you need, and help fellow students find answers.
        </p>
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-value">{requests.length}</span>
            <span className="stat-label">Latest requests shown</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{views === null ? "—" : views}</span>
            <span className="stat-label">Board views</span>
          </div>
          <div className="stat-card">
            <span className={`source-dot ${source === "Redis" ? "redis-dot" : ""}`} />
            <span className="stat-value source-value">{source}</span>
            <span className="stat-label">Latest list source</span>
          </div>
        </div>
      </section>

      <section className="content-grid">
        <div className="panel form-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">CONTRIBUTE</p>
              <h2>Post a help request</h2>
            </div>
            <span className="heading-icon">＋</span>
          </div>
          <form onSubmit={handleSubmit}>
            <label htmlFor="student_name">Your name</label>
            <input
              id="student_name"
              name="student_name"
              type="text"
              placeholder="Enter your name"
              maxLength={50}
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              required
            />

            <div className="label-row">
              <label htmlFor="message">What do you need help with?</label>
              <span>{message.length}/200</span>
            </div>
            <textarea
              id="message"
              name="message"
              placeholder="Describe your question or request..."
              maxLength={200}
              rows={5}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
            />

            {error && <p className="feedback error" role="alert">{error}</p>}
            {notice && <p className="feedback success" role="status">{notice}</p>}

            <button className="primary-button" type="submit" disabled={posting}>
              {posting ? "Posting..." : "Post Request"}
              <span aria-hidden="true">→</span>
            </button>
            <p className="form-note">Please keep your request clear and under 200 characters.</p>
          </form>
        </div>

        <div className="panel requests-panel">
          <div className="section-heading">
            <div>
              <p className="eyebrow">COMMUNITY BOARD</p>
              <h2>Latest requests</h2>
              <p className="panel-subtitle">The 10 most recent student requests.</p>
            </div>
            <button className="refresh-button" onClick={() => void loadRequests()} type="button" aria-label="Refresh requests">
              ↻
            </button>
          </div>

          <div className="cache-note">
            <span className={`source-dot ${source === "Redis" ? "redis-dot" : ""}`} />
            Showing data from <strong>{source}</strong>
            {source === "Redis" && <span className="cache-ttl">60s cache</span>}
          </div>

          {loading ? (
            <div className="empty-state">Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon">✎</span>
              <strong>No requests yet</strong>
              <span>Be the first to post a campus question.</span>
            </div>
          ) : (
            <div className="request-list">
              {requests.map((item) => (
                <article className="request-item" key={item.id}>
                  <div className="request-avatar">
                    {item.student_name.trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="request-body">
                    <div className="request-meta">
                      <strong>{item.student_name}</strong>
                      <time dateTime={item.created_at}>
                        {new Date(item.created_at).toLocaleString()}
                      </time>
                    </div>
                    <p>{item.message}</p>
                    <span className="request-id">Request #{item.id}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="footer">
        <span>Campus Help Desk</span>
        <span>PostgreSQL · Redis · Next.js</span>
      </footer>
    </main>
  );
}
