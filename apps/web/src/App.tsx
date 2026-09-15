import { useEffect, useState } from 'react';

type ApiState = 'checking' | 'ok' | 'unreachable';

// The starter chat page. It shows the shape of the window and whether the API
// answers; no model is connected yet, so sending stays switched off.
export function App() {
  const [api, setApi] = useState<ApiState>('checking');

  useEffect(() => {
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: { status?: string }) => setApi(body.status === 'ok' ? 'ok' : 'unreachable'))
      .catch(() => setApi('unreachable'));
  }, []);

  return (
    <main className="chat">
      <header className="chat-header">
        <h1>Spindle</h1>
        <p className="api-status" data-state={api}>
          API: {api}
        </p>
      </header>

      <section className="messages" aria-label="Conversation" aria-live="polite">
        <p className="empty">No conversation yet. The chat path arrives in a later stage.</p>
      </section>

      <form className="composer" onSubmit={(event) => event.preventDefault()}>
        <label htmlFor="message" className="visually-hidden">
          Message
        </label>
        <input id="message" disabled placeholder="Sending arrives in a later stage" />
        <button type="submit" disabled>
          Send
        </button>
      </form>
    </main>
  );
}
