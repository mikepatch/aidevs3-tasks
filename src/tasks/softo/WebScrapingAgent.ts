import chalk from "chalk";
import OpenAI from "openai";
import * as cheerio from "cheerio";
import { OpenaiService } from "../../services/OpenaiService";
import axios from "axios";
import {
  AnalysisResponse,
  Answer,
  FormattedQuestions,
  LinkAnalysisResponse,
} from "./types";
import {
  getAnalysisSystemPrompt,
  getFormatQuestionsPrompt,
  getLinkSelectionPrompt,
} from "./prompts";

export class WebScrapingAgent {
  private readonly MAX_DEPTH = 20;
  private readonly MIN_CONFIDENCE = 30;
  private readonly BLOCKED_DOMAINS = ["facebook.com", "twitter.com"];
  private visitedPages: Map<string, string> = new Map();
  private exploredLinksPerQuestion: Map<string, Set<string>> = new Map();
  private answers: Answer[] = [];
  private baseUrl: string;
  private openai: OpenaiService;

  constructor(baseUrl: string, openai: OpenaiService) {
    this.baseUrl = baseUrl;
    this.openai = openai;
  }

  private async formatQuestions(input: unknown): Promise<FormattedQuestions> {
    const analysisResponse = (await this.openai.getCompletion({
      messages: [
        {
          role: "system",
          content: getFormatQuestionsPrompt(),
        },
        {
          role: "user",
          content: `Convert this input to array of question objects: ${JSON.stringify(
            input
          )}`,
        },
      ],
      jsonMode: true,
    })) as OpenAI.ChatCompletion;

    const content = analysisResponse.choices[0].message.content;
    if (!content) {
      throw new Error("Failed to format questions - no content in response");
    }

    return JSON.parse(content);
  }

  async findAnswers(
    questions: Record<string, string> | string
  ): Promise<Answer[]> {
    console.log(chalk.cyan.bold("\n🤖 Starting the search mission...\n"));
    try {
      // Format questions first
      const formattedQuestions = await this.formatQuestions(questions);

      for (const { id, question } of formattedQuestions.result) {
        console.log(
          chalk.yellow.bold(
            `\n🔍 Processing question ${chalk.white(id)}: "${chalk.white(
              question
            )}"`
          )
        );
        await this.findAnswerForQuestion(id, question);
      }

      return this.answers;
    } catch (error) {
      console.error("Error in findAnswers:", error);
      throw error;
    }
  }

  private async findAnswerForQuestion(
    questionId: string,
    question: string,
    depth: number = 0,
    visitQueue: string[] = []
  ): Promise<void> {
    if (depth > this.MAX_DEPTH) {
      console.log(
        chalk.yellow.bold("⚠️  Max depth reached, stopping this branch")
      );
      return;
    }

    // Initialize explored links set for this question if not exists
    if (!this.exploredLinksPerQuestion.has(questionId)) {
      this.exploredLinksPerQuestion.set(questionId, new Set());
    }
    const exploredLinks = this.exploredLinksPerQuestion.get(questionId)!;

    // Get the current URL to process
    let currentUrl: string | null;
    if (depth === 0) {
      currentUrl = this.baseUrl;
    } else if (visitQueue.length > 0) {
      // Get next unexplored URL from queue
      currentUrl = visitQueue.find((url) => !exploredLinks.has(url)) ?? null;
      // Remove explored URLs from queue
      visitQueue = visitQueue.filter((url) => !exploredLinks.has(url));
    } else {
      currentUrl = await this.decideBestNextPage(question);
    }

    if (!currentUrl || exploredLinks.has(currentUrl)) return;

    // Mark URL as explored for this question
    exploredLinks.add(currentUrl);

    // Important: Don't skip analysis even for visited pages
    const pageContent = this.visitedPages.has(currentUrl)
      ? this.visitedPages.get(currentUrl)!
      : await this.getPageContent(currentUrl);

    if (!pageContent) {
      if (visitQueue.length > 0) {
        await this.findAnswerForQuestion(
          questionId,
          question,
          depth,
          visitQueue
        );
      }
      return;
    }

    console.log(
      chalk.cyan.bold(`\n📄 Analyzing page: ${chalk.underline(currentUrl)}`)
    );

    const analysisResponse = (await this.openai.getCompletion({
      messages: [
        {
          role: "system",
          content: getAnalysisSystemPrompt(),
        },
        {
          role: "user",
          content: `
        <question>${question}</question>
        <page_content>${pageContent}</page_content>
        `,
        },
      ],
      jsonMode: true,
    })) as OpenAI.ChatCompletion;

    const analysis = JSON.parse(
      analysisResponse.choices[0].message.content!
    ) as AnalysisResponse;

    console.log(chalk.blue(`🤔 Analysis: ${chalk.italic(analysis.reasoning)}`));

    if (analysis.hasAnswer) {
      console.log(
        chalk.green.bold(
          `✅ Found answer with ${analysis.confidence}% confidence!`
        )
      );
      console.log(chalk.white.bold(`✅ ${analysis.answer}`));
      this.answers.push({
        questionId,
        answer: analysis.answer,
        confidence: analysis.confidence,
      });
    } else if (
      analysis.nextLinks &&
      analysis.nextLinks.length > 0 &&
      analysis.confidence > this.MIN_CONFIDENCE
    ) {
      // Filter out already explored links
      const newLinks = analysis.nextLinks.filter(
        (link) => !exploredLinks.has(link)
      );

      if (newLinks.length > 0) {
        const [primaryLink, ...alternativeLinks] = newLinks;
        console.log(
          chalk.magenta(`➡️  Prioritizing path: ${chalk.bold(primaryLink)}`)
        );

        visitQueue.unshift(primaryLink);
        visitQueue.push(...alternativeLinks);

        await this.findAnswerForQuestion(
          questionId,
          question,
          depth + 1,
          visitQueue
        );
      } else if (visitQueue.length > 0) {
        console.log(chalk.yellow("⚠️  All suggested links have been explored"));
        await this.findAnswerForQuestion(
          questionId,
          question,
          depth,
          visitQueue
        );
      }
    } else if (visitQueue.length > 0) {
      // Continue with next URL in queue even if no new links found
      await this.findAnswerForQuestion(questionId, question, depth, visitQueue);
    } else {
      console.log(chalk.red("❌ No more promising leads found"));
      if (!this.answers.find((a) => a.questionId === questionId)) {
        this.answers.push({
          questionId,
          answer: null,
          confidence: 0,
        });
      }
    }
  }

  private async decideBestNextPage(question: string): Promise<string | null> {
    console.log(
      chalk.cyan.bold("\n🔍 Analyzing visited pages for next best link...")
    );

    // Collect all visited pages and their content
    const pagesData = Array.from(this.visitedPages.entries()).map(
      ([url, content]) => ({ url, content })
    );

    const analysisResponse = (await this.openai.getCompletion({
      messages: [
        {
          role: "system",
          content:
            "You are a strategic web navigator. Analyze the available links and determine the most promising one to follow next. Be careful about potential traps like circular references or irrelevant content.",
        },
        {
          role: "user",
          content: getLinkSelectionPrompt(question, JSON.stringify(pagesData)),
        },
      ],
      jsonMode: true,
    })) as OpenAI.ChatCompletion;

    const analysis = JSON.parse(
      analysisResponse.choices[0].message.content!
    ) as LinkAnalysisResponse;
    console.log(
      chalk.blue(
        `🤔 Link selection reasoning: ${chalk.italic(analysis.reasoning)}`
      )
    );

    if (analysis.selectedLink && analysis.confidence > this.MIN_CONFIDENCE) {
      console.log(
        chalk.magenta.bold(
          `🎯 Selected next link with ${chalk.white(
            analysis.confidence
          )}% confidence: ${chalk.underline(analysis.selectedLink)}`
        )
      );
      return analysis.selectedLink;
    }

    console.log(chalk.red("❌ No promising unvisited links found"));
    return null;
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async getPageContent(url: string): Promise<string | null> {
    if (!this.isValidUrl(url)) {
      console.log(chalk.yellow(`⚠️ Skipping invalid or blocked URL: ${url}`));
      return null;
    }

    await this.delay(2000 + Math.random() * 3000);

    if (this.visitedPages.has(url)) {
      console.log(
        chalk.gray(`📋 Using cached content for ${chalk.italic(url)}`)
      );
      return this.visitedPages.get(url)!;
    }

    try {
      console.log(chalk.blue(`🌐 Fetching ${chalk.underline(url)}`));
      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          Connection: "keep-alive",
          Referer: new URL(url).origin,
        },
        timeout: 10000,
        maxRedirects: 5,
      });

      // Check if response is HTML
      const contentType = response.headers["content-type"];
      if (!contentType || !contentType.includes("text/html")) {
        console.log(chalk.yellow(`⚠️ Skipping non-HTML content at ${url}`));
        return null;
      }

      const $ = cheerio.load(response.data);

      // Remove potentially harmful elements
      $("script").remove();
      $("style").remove();

      // Extract ALL links, including those from subpages
      const links = $("a")
        .map((_, el) => {
          const href = $(el).attr("href");
          if (!href) return null;
          try {
            // Allow any valid URL, but optionally stay within the same domain as baseUrl
            const fullUrl = new URL(href, url).href;
            // Optional: Check if URL is from the same domain as baseUrl
            if (fullUrl.startsWith(new URL(this.baseUrl).origin)) {
              return fullUrl;
            }
            // Or allow any URL:
            return fullUrl;
          } catch {
            return null;
          }
        })
        .get()
        .filter(Boolean);

      // Extract content with better structure preservation
      const contentWithLinks = $("body")
        .find("p, h1, h2, h3, h4, h5, h6, li, a")
        .map((_, el) => {
          const $el = $(el);
          if ($el.is("a")) {
            return `Link: ${$el.text().trim()} (${$el.attr("href")}) - Title: ${
              $el.attr("title") || "No title"
            }`;
          }
          if ($el.is("li")) {
            // Preserve list item content with its full text
            return `• ${$el.text().trim()}`;
          }
          if ($el.is("h1, h2, h3, h4, h5, h6")) {
            // Preserve headings with clear distinction
            return `\nHeading: ${$el.text().trim()}\n`;
          }
          // Regular paragraph content
          return $el.text().trim();
        })
        .get()
        .filter((text) => text.length > 0) // Remove empty lines
        .join("\n");

      const content = `
    Page Content:
    ${contentWithLinks}

    Available Links:
    ${links.join("\n")}
  `;

      this.visitedPages.set(url, content);
      return content;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 403) {
          console.error(
            chalk.red(
              `🚫 Access forbidden (403) for ${url}. Consider adding more headers or using a proxy.`
            )
          );
        } else if (error.response?.status === 429) {
          console.error(
            chalk.red(
              `⏳ Rate limited (429) for ${url}. Waiting longer between requests might help.`
            )
          );
          // Optional: implement exponential backoff
          await this.delay(30000);
        } else if (error.code === "ECONNREFUSED") {
          console.error(
            chalk.red(
              `🔌 Connection refused for ${url}. The server might be blocking requests.`
            )
          );
        }
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(
        chalk.red(`❌ Error fetching ${chalk.underline(url)}:`),
        chalk.red.dim(errorMessage)
      );
      return null;
    }
  }

  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return !this.BLOCKED_DOMAINS.some((domain) =>
        parsedUrl.hostname.includes(domain)
      );
    } catch {
      return false;
    }
  }
}
