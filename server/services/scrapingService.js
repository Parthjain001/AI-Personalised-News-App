const axios = require('axios');
const Article = require('../models/Article');
const AIService = require('./aiService');
const JSON5 = require('json5');

class ScrapingService {
  static async processAndSaveArticles(articles) {
    const savedArticles = [];

    for (const article of articles) {
      try {
        // Check if article already exists
        const existingArticle = await Article.findOne({ url: article.url });
        if (existingArticle) {
          continue;
        }

        // Generate AI summary
        const summary = await AIService.generateSummary(article.content, article.title);
        // Analyze article with AI
        const analysis = await AIService.analyzeArticle(article.content, article.title);

        // DEBUG: Log the raw entities value from AI
        console.log('RAW AI entities:', analysis.entities, 'TYPE:', typeof analysis.entities);

        // Robustly parse entities as an array of objects
        let entities = analysis.entities;

        // Always force to string and parse with JSON5
        try {
          entities = JSON5.parse(typeof entities === 'string' ? entities : String(entities));
        } catch (e) {
          entities = [];
        }

        // If it's now an array of strings, parse each string
        if (Array.isArray(entities)) {
          entities = entities.flatMap(ent => {
            if (typeof ent === 'string') {
              try {
                return [JSON5.parse(ent)];
              } catch (e2) {
                return [];
              }
            } else if (typeof ent === 'object' && ent !== null) {
              return [ent];
            }
            return [];
          });
        } else {
          entities = [];
        }

        // Final filter for valid entity objects
        entities = entities.filter(
          ent => ent && typeof ent === 'object' && 'name' in ent && 'type' in ent && 'relevance' in ent
        );

        // Create new article
        const newArticle = new Article({
          title: article.title,
          content: article.content,
          summary: summary,
          url: article.url,
          source: article.source,
          category: article.category,
          tags: analysis.keywords || [],
          metadata: {
            author: 'Unknown',
            publishedAt: new Date(),
            readingTime: Math.ceil(article.content.split(' ').length / 200), // Rough estimate
            wordCount: article.content.split(' ').length,
            keywords: analysis.keywords || []
          },
          aiAnalysis: {
            summary: summary,
            keyPoints: analysis.keyPoints || [],
            sentiment: analysis.sentiment || { score: 0.5, label: 'neutral' },
            topics: analysis.topics || [],
            entities: entities
          }
        });

        await newArticle.save();
        savedArticles.push(newArticle);
        console.log(`Saved article: ${article.title}`);
      } catch (error) {
        console.error('Error saving article:', error.message);
      }
    }

    return savedArticles;
  }

  static async fetchFromNewsAPI() {
    try {
      if (!process.env.NEWS_API_KEY) {
        console.warn('News API key not configured, skipping news fetch');
        return [];
      }

      const categories = ['technology', 'business', 'sports', 'entertainment', 'science', 'health'];
      const articles = [];

      for (const category of categories) {
        try {
          const response = await axios.get(`https://newsapi.org/v2/top-headlines`, {
            params: {
              country: 'us',
              category: category,
              apiKey: process.env.NEWS_API_KEY,
              pageSize: 10
            }
          });

          if (response.data.articles) {
            articles.push(...response.data.articles.map(article => ({
              title: article.title,
              content: article.description || article.content || 'No content available',
              url: article.url,
              source: {
                name: article.source.name,
                domain: new URL(article.url).hostname
              },
              category: category,
              metadata: {
                author: article.author,
                publishedAt: new Date(article.publishedAt),
                readingTime: Math.ceil((article.description || '').split(' ').length / 200)
              }
            })));
          }
        } catch (categoryError) {
          console.error(`Error fetching ${category} news:`, categoryError.message);
        }
      }

      return await this.processAndSaveArticles(articles);
    } catch (error) {
      console.error('News API error:', error);
      return [];
    }
  }
}

module.exports = ScrapingService; 