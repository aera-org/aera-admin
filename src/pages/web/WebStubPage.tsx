import { Container, EmptyState, Stack, Typography } from '@/atoms';
import { AppShell } from '@/components/templates';

type WebStubPageProps = {
  title: string;
};

export function WebStubPage({ title }: WebStubPageProps) {
  return (
    <AppShell>
      <Container size="wide">
        <Stack gap="24px">
          <Typography variant="h2">{title}</Typography>
          <EmptyState
            title="Not available yet"
            description={`Web ${title.toLowerCase()} will be added later.`}
          />
        </Stack>
      </Container>
    </AppShell>
  );
}
