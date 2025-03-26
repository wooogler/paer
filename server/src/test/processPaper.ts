import fs from 'fs';
import path from 'path';
import { processLatexContent } from '../routes/papers';

async function testPaperProcessing() {
  try {
    // Read the test paper
    const content = fs.readFileSync(
      path.join(__dirname, '../../data/test_paper.md'),
      'utf-8'
    );

    // Get current Unix timestamp
    const baseTimestamp = Math.floor(Date.now() / 1000);

    // Process the content
    const processedContent = processLatexContent(content, baseTimestamp);

    // Create the paper object
    const paper = {
      title: content.split('\n')[0].replace('# ', ''),
      "block-id": baseTimestamp.toString(),
      summary: content.slice(0, 200) + '...',
      intent: content.slice(0, 100) + '...',
      type: 'paper',
      content: processedContent,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    };

    // Write the output to a file for inspection
    fs.writeFileSync(
      path.join(__dirname, '../../data/processed_paper.json'),
      JSON.stringify(paper, null, 2)
    );

    console.log('Paper processed successfully!');
    console.log('Output written to processed_paper.json');
  } catch (error) {
    console.error('Error processing paper:', error);
  }
}

testPaperProcessing(); 