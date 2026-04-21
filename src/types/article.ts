// Article types
export interface TopicIdea {
  title: string;
  description: string;
  keywords: string[];
  reasoning: string;
}

export interface ResearchMaterial {
  url: string;
  title: string;
  content: string;
  relevance: string;
}

export interface Outline {
  title: string;
  sections: OutlineSection[];
  writingStyle: string;
  tone: string;
}

export interface OutlineSection {
  heading: string;
  points: string[];
  estimatedLength?: number;
}

export interface Article {
  title: string;
  content: string;
  author?: string;
  createdAt: string;
  metadata: ArticleMetadata;
}

export interface ArticleMetadata {
  topic: string;
  keywords: string[];
  wordCount: number;
  readingTime: number;
}

export interface FormattedArticle {
  markdown: string;
  html: string;
  metadata: ArticleMetadata;
}

export interface ImagePrompt {
  description: string;
  style: string;
  aspectRatio?: string;
}

export interface GeneratedImage {
  url: string;
  localPath: string;
  mediaId?: string;
  prompt: string;
}
