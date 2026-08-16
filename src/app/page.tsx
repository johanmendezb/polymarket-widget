export default function HomePage() {
  return (
    <main>
      <h1>Second Opinion</h1>
      <p>Scaffold only. The widget surface arrives with E6.</p>
      {/* TEMPORARY: proves acceptance criterion 3 of T1.2. Reverted in the next
          commit. The value is a plain sentence, not a credential and not shaped
          like one. */}
      <p>{process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY ?? 'this is not a key'}</p>
    </main>
  );
}
