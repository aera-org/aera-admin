export type ProductSection =
  | 'user-progress'
  | 'activations'
  | 'conversions'
  | 'active-users'
  | 'scenarios';

export const PRODUCT_SECTIONS: { value: ProductSection; label: string }[] = [
  { value: 'user-progress', label: 'User Progress' },
  { value: 'activations', label: 'Activations' },
  { value: 'conversions', label: 'Conversions' },
  { value: 'active-users', label: 'Active Users' },
  { value: 'scenarios', label: 'Scenario Analytics' },
];

export const DEFAULT_PRODUCT_SECTION: ProductSection = 'user-progress';

export function resolveProductSection(value: string | null): ProductSection {
  return PRODUCT_SECTIONS.some((item) => item.value === value)
    ? (value as ProductSection)
    : DEFAULT_PRODUCT_SECTION;
}
