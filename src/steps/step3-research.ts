import type { Step, WorkflowContext, StepResult } from '../types';
import { logger } from '../utils/logger';
import { WebSearch, URLFetcher } from '../research';
import { promptInput, promptConfirm } from '../utils/prompts';
import { FileManager } from '../utils/file-manager';
import * as path from 'path';
import type { TopicIdea, ResearchMaterial } from '../types/article';

export class Step3Research implements Step {
  id = 3;
  name = 'Research & Material Collection';
  description = 'Gather reference materials and information';
  isKeyCheckpoint = false;

  async execute(context: WorkflowContext): Promise<StepResult> {
    logger.step(this.id, this.name);

    const selectedTopic = context.metadata.selectedTopic as TopicIdea | undefined;
    if (!selectedTopic) {
      return {
        success: false,
        error: 'No topic selected. Please complete Step 2 first.',
      };
    }

    const materials: ResearchMaterial[] = [];

    // Ask if user wants to search for references
    const shouldSearch = await promptConfirm(
      'Would you like to search for reference materials?',
      true
    );

    if (shouldSearch) {
      logger.info('Searching for reference materials...');

      const webSearch = new WebSearch();
      const searchQuery = await promptInput(
        'Enter search query (or press Enter to use topic title):',
        selectedTopic.title
      );

      const searchResults = await webSearch.searchWithRetry(searchQuery);

      if (searchResults.length > 0) {
        console.log('\nSearch Results:\n');
        searchResults.forEach((result, index) => {
          console.log(`${index + 1}. ${result.title}`);
          console.log(`   ${result.url}`);
          console.log(`   ${result.snippet}\n`);
        });

        // Fetch content from top results
        const shouldFetch = await promptConfirm(
          'Would you like to fetch content from these URLs?',
          true
        );

        if (shouldFetch) {
          const urlFetcher = new URLFetcher();
          const urls = searchResults.slice(0, 3).map((r) => r.url);
          const contents = await urlFetcher.fetchMultiple(urls);

          contents.forEach((content, index) => {
            if (!content.error && content.content) {
              materials.push({
                url: content.url,
                title: content.title,
                content: content.content,
                relevance: searchResults[index].snippet,
              });
            }
          });
        }
      } else {
        logger.warn('No search results found. You can provide URLs manually.');
      }
    }

    // Ask if user wants to add URLs manually
    const shouldAddUrls = await promptConfirm(
      'Would you like to add reference URLs manually?',
      false
    );

    if (shouldAddUrls) {
      const urlFetcher = new URLFetcher();
      let addMore = true;

      while (addMore) {
        const url = await promptInput('Enter a reference URL (or press Enter to finish):');

        if (!url) {
          addMore = false;
        } else {
          const content = await urlFetcher.fetch(url);
          if (!content.error && content.content) {
            materials.push({
              url: content.url,
              title: content.title,
              content: content.content,
              relevance: 'User-provided reference',
            });
            logger.success(`Added: ${content.title}`);
          } else {
            logger.warn(`Failed to fetch: ${url}`);
          }

          addMore = await promptConfirm('Add another URL?', true);
        }
      }
    }

    // Allow user to add notes
    const shouldAddNotes = await promptConfirm(
      'Would you like to add research notes?',
      false
    );

    if (shouldAddNotes) {
      const notes = await promptInput('Enter your research notes:');
      if (notes) {
        materials.push({
          url: 'notes://user',
          title: 'User Notes',
          content: notes,
          relevance: 'User-provided notes',
        });
      }
    }

    logger.success(`Collected ${materials.length} research material(s)`);

    // Save to file
    const outputPath = path.join(context.outputPath, '03-research.json');
    await FileManager.writeJSON(outputPath, {
      topic: selectedTopic,
      materials,
      timestamp: new Date().toISOString(),
    });

    // Store in context
    context.metadata.researchMaterials = materials;

    return {
      success: true,
      data: {
        materialsCount: materials.length,
        outputPath,
      },
    };
  }
}

export default Step3Research;
