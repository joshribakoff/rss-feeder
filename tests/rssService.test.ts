import { parseFeedContent } from '../src/services/rssService';
import fs from 'fs';
import path from 'path';
import { describe, it, expect, vi } from 'vitest';

describe('RSS Service', () => {
  describe('parseFeedContent', () => {
    describe('Hacker News feed', () => {
      it.only('should parse first article correctly', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/hackernews.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0]).toMatchInlineSnapshot(`
          {
            "content": "",
            "link": "https://ironclad-os.org/",
            "title": "Ironclad – formally verified, real-time capable, Unix-like OS kernel",
          }
        `);
      });

      it('should parse multiple HN articles', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/hackernews.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0].title).toMatchInlineSnapshot(`"Ironclad – formally verified, real-time capable, Unix-like OS kernel"`);
        expect(result[1].title).toMatchInlineSnapshot(`"Marko – A declarative, HTML‑based language"`);
        expect(result[2].title).toMatchInlineSnapshot(`"IP Blocking the UK Is Not Enough to Comply with the Online Safety Act"`);

        // HN feeds have descriptions that only contain "Comments" which is filtered out
        // Content is empty because all articles have identical unhelpful content
        expect(result[0].content).toMatchInlineSnapshot(`""`);
        expect(result[1].content).toMatchInlineSnapshot(`""`);
        expect(result[2].content).toMatchInlineSnapshot(`""`);
      });

      it('should limit to MAX_ARTICLES_PER_FEED', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/hackernews.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);
        expect(result.length).toMatchInlineSnapshot(`10`);
      });
    });

    describe('TechCrunch feed', () => {
      it('should parse first article correctly', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techcrunch.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0]).toMatchInlineSnapshot(`
          {
            "content": "A rough week for tech stocks might signal a loss of investor confidence in artificial intelligence.",
            "link": "https://techcrunch.com/2025/11/08/is-wall-street-losing-faith-in-ai/",
            "title": "Is Wall Street losing faith in AI?",
          }
        `);
      });

      it('should parse multiple TechCrunch articles with descriptions', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techcrunch.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0].title).toMatchInlineSnapshot(`"Is Wall Street losing faith in AI?"`);
        expect(result[0].content).toMatchInlineSnapshot(`"A rough week for tech stocks might signal a loss of investor confidence in artificial intelligence."`);

        expect(result[1].title).toMatchInlineSnapshot(`"‘Breaking Bad’ creator’s new show ‘Pluribus’ was emphatically ‘made by humans,’ not AI"`);
        expect(result[1].content).toMatchInlineSnapshot(`"If you watched all the way to the end of the new Apple TV show “Pluribus,” you may have noticed an unusual disclaimer in the credits: “This show was made by humans.”"`);

        expect(result[2].title).toMatchInlineSnapshot(`"OpenAI asked Trump administration to expand Chips Act tax credit to cover data centers"`);
        expect(result[2].content).toMatchInlineSnapshot(`"A recent letter from OpenAI reveals more details about how the company is hoping the federal government can support the company's ambitious plans for data center construction."`);
      });

      it('should limit to MAX_ARTICLES_PER_FEED', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techcrunch.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);
        expect(result.length).toMatchInlineSnapshot(`10`);
      });
    });

    describe('Techmeme feed', () => {
      it('should parse first article correctly', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techmeme.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0].title).toMatchInlineSnapshot(`"As US schools adopt AI, a look at the growing use of AI-powered monitoring tools like GoGuardian to scan students' chatbot conversations for signs of self-harm (Janne Knodler/Bloomberg)"`);
        expect(result[0].link).toMatchInlineSnapshot(`"http://www.techmeme.com/251108/p11#a251108p11"`);
        // Techmeme descriptions contain HTML formatting - parser extracts clean text
        expect(result[0].content).toMatchInlineSnapshot(`
          "Janne Knodler / Bloomberg:
          As US schools adopt AI, a look at the growing use of AI-powered monitoring tools like GoGuardian to scan students' chatbot conversations for signs of self-harm  —  As US educators embrace AI in the classroom, firms are selling software to flag mentions of self-harm, raising concerns over privacy and control."
        `);
      });

      it('should parse multiple Techmeme articles with HTML-rich descriptions', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techmeme.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);

        expect(result[0].title).toMatchInlineSnapshot(`"As US schools adopt AI, a look at the growing use of AI-powered monitoring tools like GoGuardian to scan students' chatbot conversations for signs of self-harm (Janne Knodler/Bloomberg)"`);
        expect(result[1].title).toMatchInlineSnapshot(`"Chinese robotaxi companies' tech and rider experience are generally similar to Waymo's, as they build businesses at home while also expanding internationally (Peter Landers/Wall Street Journal)"`);
        expect(result[2].title).toMatchInlineSnapshot(`"Several of Asia's top tycoons and conglomerates are joining the data center race as tech giants plan $240B in APAC hyperscale expansion over the next five years (Jonathan Burgos/Forbes)"`);

        // All should have meaningful content extracted from HTML
        expect(result[0].content.length).toBeGreaterThan(100);
        expect(result[1].content.length).toBeGreaterThan(100);
        expect(result[2].content.length).toBeGreaterThan(100);
      });

      it('should limit to MAX_ARTICLES_PER_FEED', async () => {
        const mockContent = fs.readFileSync(path.join(__dirname, 'mocks/techmeme.xml'), 'utf-8');
        const result = await parseFeedContent(mockContent);
        expect(result.length).toMatchInlineSnapshot(`10`);
      });
    });

    describe('Edge cases', () => {
      it('should handle empty content', async () => {
          const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await parseFeedContent('');
        expect(result).toMatchInlineSnapshot(`[]`);
        consoleErrorSpy.mockRestore();
      });

      it('should handle malformed XML', async () => {
        const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
        const result = await parseFeedContent('<not>valid</xml>');
        expect(result).toMatchInlineSnapshot(`[]`);
        consoleErrorSpy.mockRestore();
      });
    });
  });
});