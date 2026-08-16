import { parseWidgetTheme, sampleRecommendation, WidgetShell } from '@/ui';

interface WidgetPageProps {
  readonly searchParams: Promise<{ readonly theme?: string | readonly string[] }>;
}

export default async function WidgetPage({ searchParams }: WidgetPageProps) {
  const { theme: rawTheme } = await searchParams;
  const theme = parseWidgetTheme(rawTheme);
  const { verdict, estimatedEdge } = sampleRecommendation;

  return (
    <WidgetShell theme={theme}>
      <p>Second Opinion</p>
      <dl aria-label="fixture data check" data-testid="fixture-recommendation">
        <dt>verdict</dt>
        <dd>{verdict}</dd>
        <dt>estimated edge</dt>
        <dd>{estimatedEdge}</dd>
      </dl>
    </WidgetShell>
  );
}
