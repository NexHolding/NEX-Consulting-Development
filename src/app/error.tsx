"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="wrap section">
      <h1>
        Das hat gerade
        <br />
        nicht geklappt.
      </h1>
      <p>
        Die Daten konnten nicht geladen werden. Bitte versuchen Sie es erneut.
      </p>
      <button className="button" onClick={reset}>
        Erneut versuchen
      </button>
    </main>
  );
}
