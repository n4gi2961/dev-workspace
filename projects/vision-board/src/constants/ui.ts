// Categories for goals (labels are in translation files: pageEditor.category.{id})
export const CATEGORIES = [
  { id: 'place', color: 'bg-blue-500' },
  { id: 'state', color: 'bg-green-500' },
  { id: 'experience', color: 'bg-purple-500' },
] as const;

// Decades for timeline (labels are in translation files: pageEditor.targetYear.{id})
export const DECADES = [
  { id: '2020s' },
  { id: '2030s' },
  { id: '2040s' },
  { id: '2050s' },
  { id: '2060s' },
] as const;

// Sample images
export const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&h=300&fit=crop',
];
