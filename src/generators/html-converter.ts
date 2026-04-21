import { marked } from 'marked';
import { logger } from '../utils/logger';

export class HTMLConverter {
  async convert(markdown: string): Promise<string> {
    logger.info('Converting Markdown to HTML...');

    // Configure marked
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    // Convert markdown to HTML
    const html = await marked(markdown);

    // Apply WeChat-friendly styles
    const styledHtml = this.applyWeChatStyles(html);

    logger.success('Converted to HTML');

    return styledHtml;
  }

  private applyWeChatStyles(html: string): string {
    // Add inline styles for WeChat compatibility
    return html
      .replace(/<h1>/g, '<h1 style="font-size: 24px; font-weight: bold; margin: 20px 0 10px 0;">')
      .replace(/<h2>/g, '<h2 style="font-size: 20px; font-weight: bold; margin: 18px 0 9px 0;">')
      .replace(/<h3>/g, '<h3 style="font-size: 18px; font-weight: bold; margin: 16px 0 8px 0;">')
      .replace(/<p>/g, '<p style="margin: 10px 0; line-height: 1.8; font-size: 16px;">')
      .replace(/<img /g, '<img style="max-width: 100%; height: auto; display: block; margin: 20px auto;" ')
      .replace(/<blockquote>/g, '<blockquote style="border-left: 4px solid #e0e0e0; padding-left: 16px; margin: 16px 0; color: #666;">')
      .replace(/<code>/g, '<code style="background-color: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-family: monospace;">')
      .replace(/<pre>/g, '<pre style="background-color: #f5f5f5; padding: 16px; border-radius: 4px; overflow-x: auto; line-height: 1.5;">');
  }

  wrapWithTemplate(html: string, title: string): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif; line-height: 1.8; color: #333; max-width: 100%; padding: 20px; margin: 0;">
${html}
</body>
</html>`;
  }
}

export default HTMLConverter;
