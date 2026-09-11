/**
 * Runtime source for the Ubunifu identity. CSS repeats these values as custom
 * properties, while React-rendered marks and app icons consume them directly.
 */
export const brandColors = {
  ink: '#1F1A36',
  orange: '#FF6B2C',
  /* Kept in step with --brand-deep in globals.css, which was darkened so the
     reading orange keeps AA contrast over the ambient field. */
  orangeDeep: '#A63A11',
  violet: '#6D3FE8',
  white: '#FFFFFF',
  canvas: '#F4F2FB',
} as const;

/**
 * The Ubunifu Ligature: an orange U and a violet T interlock as one mark.
 * Dark navy anchors the accompanying wordmark and surrounding system.
 */
export const brandMarkPaths = {
  u: 'M11 17v18c0 13 8 20 20 20 7 0 11-2 13-5',
  tStem: 'M43 13v23c0 11 6 18 14 18',
  tCrown: 'M29 16 57 10',
} as const;
