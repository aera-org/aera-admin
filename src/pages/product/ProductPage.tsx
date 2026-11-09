import { useEffect } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

import { Button, ButtonGroup, Container, Typography } from '@/atoms';
import { AppShell } from '@/components/templates';
import { ActivationsSection } from '@/pages/activations/ActivationsPage';
import { ActiveUsersSection } from '@/pages/analytics/ActiveUsersPage';
import { ScenarioAnalyticsSection } from '@/pages/analytics/ScenarioAnalyticsPage';
import { ConversionsSection } from '@/pages/conversions/ConversionsPage';
import { UserProgressSection } from '@/pages/user-progress/UserProgressPage';

import s from './ProductPage.module.scss';
import {
  PRODUCT_SECTIONS,
  type ProductSection,
  resolveProductSection,
} from './productSections';

const SECTION_COMPONENTS: Record<ProductSection, () => React.JSX.Element> = {
  'user-progress': UserProgressSection,
  activations: ActivationsSection,
  conversions: ConversionsSection,
  'active-users': ActiveUsersSection,
  scenarios: ScenarioAnalyticsSection,
};

export function ProductPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSection = searchParams.get('section');
  const section = resolveProductSection(rawSection);
  const SectionComponent = SECTION_COMPONENTS[section];

  useEffect(() => {
    if (rawSection === section) return;
    const next = new URLSearchParams(searchParams);
    next.set('section', section);
    setSearchParams(next, { replace: true });
  }, [rawSection, searchParams, section, setSearchParams]);

  return (
    <AppShell>
      <Container className={s.page} size="wide">
        <div className={s.header}>
          <Typography variant="h2">Product</Typography>
          <ButtonGroup>
            {PRODUCT_SECTIONS.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant="ghost"
                // Section filters use different params, so start clean.
                onClick={() => setSearchParams({ section: item.value })}
                disabled={item.value === section}
              >
                {item.label}
              </Button>
            ))}
          </ButtonGroup>
        </div>

        <SectionComponent key={section} />
      </Container>
    </AppShell>
  );
}

/** Keeps old standalone URLs working: /activations?x=1 → /product?section=activations&x=1 */
export function ProductRedirect({ section }: { section: ProductSection }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  params.set('section', section);
  return <Navigate to={`/product?${params.toString()}`} replace />;
}
