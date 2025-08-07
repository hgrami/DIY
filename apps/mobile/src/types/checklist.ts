export type ChecklistDensity = 'compact' | 'normal' | 'comfortable';

export interface DensityConfig {
  cardHeight: number;
  verticalPadding: number;
  horizontalPadding: number;
  fontSize: number;
  lineHeight: number;
  checkboxSize: number;
  marginVertical: number;
  checkboxMargin: number;
}

export const DENSITY_CONFIGS: Record<ChecklistDensity, DensityConfig> = {
  compact: {
    cardHeight: 42,
    verticalPadding: 8,
    horizontalPadding: 12,
    fontSize: 14,
    lineHeight: 18,
    checkboxSize: 20,
    marginVertical: 2,
    checkboxMargin: 10,
  },
  normal: {
    cardHeight: 48,
    verticalPadding: 12,
    horizontalPadding: 16,
    fontSize: 16,
    lineHeight: 20,
    checkboxSize: 24,
    marginVertical: 4,
    checkboxMargin: 12,
  },
  comfortable: {
    cardHeight: 64,
    verticalPadding: 16,
    horizontalPadding: 20,
    fontSize: 18,
    lineHeight: 24,
    checkboxSize: 28,
    marginVertical: 6,
    checkboxMargin: 16,
  },
};