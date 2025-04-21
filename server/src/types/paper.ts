export interface Paper {
  _id: string;
  title: string;
  summary: string;
  intent: string;
  type: 'paper';
  content: Array<{
    type: 'text';
    content: string;
    'block-id': string;
    summary: string;
    intent: string;
  }>;
  'block-id': string;
  createdAt: string;
  updatedAt: string;
} 