import { HostThemeSwitcher } from './HostThemeSwitcher';

export default function HomePage() {
  return (
    <main>
      <h1>Second Opinion</h1>
      <p>
        This page stands in for a third-party site embedding the widget. The widget itself lives
        at <code>/widget</code>, isolated in a sandboxed iframe below.
      </p>
      <HostThemeSwitcher />
    </main>
  );
}
