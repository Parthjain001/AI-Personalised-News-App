const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AIService {
  static async generateSummary(content, title) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        console.warn('OpenAI API key not configured, using fallback summary');
        return this.generateFallbackSummary(content);
      }

      const prompt = `
        Please provide a comprehensive summary of the following article. 
        The summary should be:
        - Concise but informative (2-3 sentences)
        - Capture the main points and key insights
        - Written in a neutral, objective tone
        - Suitable for a news aggregation platform
        
        Article Title: ${title}
        Article Content: ${content.substring(0, 3000)} // Limit content length
        
        Please provide only the summary without any additional formatting or labels.
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional news summarizer. Provide clear, accurate summaries of news articles."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('OpenAI API error:', error);
      return this.generateFallbackSummary(content);
    }
  }

  static async analyzeArticle(content, title) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return this.generateFallbackAnalysis(content, title);
      }

      const prompt = `
        Analyze the following article and provide:
        1. Key points (3-5 bullet points)
        2. Sentiment analysis (positive/negative/neutral with confidence score)
        3. Main topics/themes
        4. Named entities (people, organizations, locations)
        5. Keywords for categorization
        
        Article Title: ${title}
        Article Content: ${content.substring(0, 3000)}
        
        Please format your response as JSON with the following structure:
        {
          "keyPoints": ["point1", "point2", "point3"],
          "sentiment": {"score": 0.8, "label": "positive"},
          "topics": ["topic1", "topic2"],
          "entities": [{"name": "entity", "type": "person", "relevance": 0.9}],
          "keywords": ["keyword1", "keyword2"]
        }
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an AI news analyst. Provide structured analysis in JSON format."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.2,
      });

      const analysisText = response.choices[0].message.content.trim();
      
      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        console.error('Failed to parse AI analysis:', parseError);
        return this.generateFallbackAnalysis(content, title);
      }
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return this.generateFallbackAnalysis(content, title);
    }
  }

  static async generatePersonalizedRecommendations(userBehavior, availableArticles) {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return this.generateFallbackRecommendations(userBehavior, availableArticles);
      }

      // Extract user preferences from behavior
      const likedCategories = userBehavior.likedArticles.map(article => article.category);
      const dislikedCategories = userBehavior.dislikedArticles.map(article => article.category);
      const searchHistory = userBehavior.searchHistory.map(search => search.query);

      const prompt = `
        Based on the following user behavior, recommend articles from the available list:
        
        User Behavior:
        - Liked categories: ${[...new Set(likedCategories)].join(', ')}
        - Disliked categories: ${[...new Set(dislikedCategories)].join(', ')}
        - Search history: ${searchHistory.join(', ')}
        
        Available Articles (first 10 titles):
        ${availableArticles.slice(0, 10).map(article => `- ${article.title}`).join('\n')}
        
        Please return a JSON array of article IDs that would be most relevant to this user, ordered by relevance.
        Consider:
        - Category preferences
        - Search history patterns
        - Avoid disliked categories
        - Mix of familiar and new topics
        
        Return format: ["articleId1", "articleId2", "articleId3"]
      `;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a recommendation engine. Return only JSON array of article IDs."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const recommendationsText = response.choices[0].message.content.trim();
      
      try {
        return JSON.parse(recommendationsText);
      } catch (parseError) {
        console.error('Failed to parse recommendations:', parseError);
        return this.generateFallbackRecommendations(userBehavior, availableArticles);
      }
    } catch (error) {
      console.error('OpenAI recommendations error:', error);
      return this.generateFallbackRecommendations(userBehavior, availableArticles);
    }
  }

  // Fallback methods when OpenAI is not available
  static generateFallbackSummary(content) {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const summary = sentences.slice(0, 3).join('. ') + '.';
    return summary.length > 200 ? summary.substring(0, 200) + '...' : summary;
  }

  static generateFallbackAnalysis(content, title) {
    const words = content.toLowerCase().split(/\s+/);
    const wordFreq = {};
    words.forEach(word => {
      if (word.length > 3) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });

    const keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    return {
      keyPoints: [
        "Article discusses important developments",
        "Contains relevant information for readers",
        "Addresses current topics of interest"
      ],
      sentiment: { score: 0.5, label: "neutral" },
      topics: ["news", "current events"],
      entities: [],
      keywords: keywords
    };
  }

  static generateFallbackRecommendations(userBehavior, availableArticles) {
    // Simple collaborative filtering fallback
    const likedCategories = userBehavior.likedArticles.map(article => article.category);
    const categoryCounts = {};
    
    likedCategories.forEach(category => {
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    const preferredCategories = Object.entries(categoryCounts)
      .sort(([,a], [,b]) => b - a)
      .map(([category]) => category);

    return availableArticles
      .filter(article => preferredCategories.includes(article.category))
      .slice(0, 10)
      .map(article => article._id.toString());
  }
}

module.exports = AIService; 