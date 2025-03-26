import axios from 'axios';

interface ProcessedPaper {
  title: string;
  content: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
}

export const processPaperContent = async (content: string): Promise<ProcessedPaper> => {
  try {
    const response = await axios.post('/api/papers/process', { content });
    return response.data;
  } catch (error) {
    console.error('Error processing paper:', error);
    throw error;
  }
};

export const savePaper = async (paper: ProcessedPaper): Promise<void> => {
  try {
    await axios.post('/api/papers', paper);
  } catch (error) {
    console.error('Error saving paper:', error);
    throw error;
  }
}; 