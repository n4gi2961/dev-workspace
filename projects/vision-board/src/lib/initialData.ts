import { BLOCK_TYPES } from '@/constants/types';
import { generateId } from './utils';

export const createInitialBlocks = () => {
  return [{
    id: generateId(),
    type: BLOCK_TYPES.TEXT,
    content: '',
    checked: false,
    isOpen: true,
    children: [],
  }];
};

export const createInitialPage = () => ({
  title: '',
  description: '',
  headerImage: null,
  category: null,
  targetDecade: null,
  milestones: [],
  routines: [],
  blocks: createInitialBlocks(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
