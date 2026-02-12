export type BackgroundType =
  | 'default'
  | 'dark_wood'
  | 'dark_leather'
  | 'dark_cross'
  | 'navy_noise'
  | 'natural_wood'
  | 'cork_board'
  | 'line_paper_black'
  | 'line_paper_white'
  | 'tiny_squares'
  | 'dot_leather_black'
  | 'dot_leather_white';

export interface BoardBackground {
  type: BackgroundType;
  label: string;
  pattern?: number; // require() returns number in RN
  color?: string;
}

export const BOARD_BACKGROUNDS: BoardBackground[] = [
  {
    type: 'default',
    label: 'default',
    color: '#111827',
  },
  {
    type: 'dark_wood',
    label: 'dark wood',
    pattern: require('../assets/patterns/dark_wood.jpg'),
  },
  {
    type: 'dark_leather',
    label: 'dark leather',
    pattern: require('../assets/patterns/dark_leather.jpg'),
  },
  {
    type: 'dark_cross',
    label: 'dark cross',
    pattern: require('../assets/patterns/dark_cross.webp'),
  },
  {
    type: 'navy_noise',
    label: 'navy noise',
    pattern: require('../assets/patterns/navy_noise.webp'),
  },
  {
    type: 'natural_wood',
    label: 'natural wood',
    pattern: require('../assets/patterns/natural_wood.webp'),
  },
  {
    type: 'cork_board',
    label: 'cork board',
    pattern: require('../assets/patterns/cork_board.jpg'),
  },
  {
    type: 'line_paper_black',
    label: 'line paper black',
    pattern: require('../assets/patterns/line_paper_black.jpg'),
  },
  {
    type: 'line_paper_white',
    label: 'line paper white',
    pattern: require('../assets/patterns/line_paper_white.jpg'),
  },
  {
    type: 'tiny_squares',
    label: 'tiny squares',
    pattern: require('../assets/patterns/tiny_squares.jpg'),
  },
  {
    type: 'dot_leather_black',
    label: 'dot leather black',
    pattern: require('../assets/patterns/dot_leather_black.jpg'),
  },
  {
    type: 'dot_leather_white',
    label: 'dot leather white',
    pattern: require('../assets/patterns/dot_leather_white.jpg'),
  },
];

export function getBackground(type?: string): BoardBackground {
  return BOARD_BACKGROUNDS.find((b) => b.type === type) || BOARD_BACKGROUNDS[0];
}
