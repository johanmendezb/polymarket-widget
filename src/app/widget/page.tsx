import { parseWidgetTheme, WidgetApp, WidgetShell } from '@/ui';

interface WidgetPageProps {
  readonly searchParams: Promise<{ readonly theme?: string | readonly string[] }>;
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const { theme: rawTheme } = await searchParams;
  const theme = parseWidgetTheme(rawTheme);

  return (
    <WidgetShell theme={theme}>
      <WidgetApp />
    </WidgetShell>
  );
}
