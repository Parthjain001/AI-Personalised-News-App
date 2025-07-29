const User = require('../models/User');
const Article = require('../models/Article');

class RecommendationService {
  // Simple user-based collaborative filtering
  static async getCollaborativeRecommendations(userId, limit = 10) {
    try {
      // 1. Get the current user's liked articles
      const user = await User.findById(userId);
      if (!user || !user.behavior || !user.behavior.likedArticles || user.behavior.likedArticles.length === 0) {
        // If user has no likes, return recent articles
        return await Article.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-content');
      }

      const likedArticleIds = user.behavior.likedArticles.map(articleId => articleId.toString());

      // 2. Find other users who liked the same articles
      const similarUsers = await User.find({
        'behavior.likedArticles': { $in: likedArticleIds },
        _id: { $ne: userId }
      }).populate('behavior.likedArticles', 'category tags aiAnalysis');

      if (similarUsers.length === 0) {
        // If no similar users, return recent articles
        return await Article.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-content');
      }

      // 3. Collect articles liked by similar users, excluding those already liked by the current user
      const recommendedArticleIds = new Set();
      const articleScores = new Map(); // Track how many similar users liked each article

      for (const simUser of similarUsers) {
        for (const likedArticle of simUser.behavior.likedArticles) {
          const articleId = likedArticle._id.toString();
          if (!likedArticleIds.includes(articleId)) {
            recommendedArticleIds.add(articleId);
            articleScores.set(articleId, (articleScores.get(articleId) || 0) + 1);
          }
        }
      }

      if (recommendedArticleIds.size === 0) {
        // If no new recommendations, return recent articles
        return await Article.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-content');
      }

      // 4. Fetch article details and sort by recommendation score
      const articles = await Article.find({ 
        _id: { $in: Array.from(recommendedArticleIds) },
        isActive: true 
      })
        .select('-content')
        .exec();

      // Sort by recommendation score (how many similar users liked it)
      articles.sort((a, b) => {
        const scoreA = articleScores.get(a._id.toString()) || 0;
        const scoreB = articleScores.get(b._id.toString()) || 0;
        return scoreB - scoreA;
      });

      return articles.slice(0, limit);
    } catch (error) {
      console.error('Collaborative filtering error:', error);
      // Fallback to recent articles
      return await Article.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-content');
    }
  }

  // Content-based filtering using article categories and tags
  static async getContentBasedRecommendations(userId, limit = 10) {
    try {
      const user = await User.findById(userId);
      if (!user || !user.behavior || !user.behavior.likedArticles || user.behavior.likedArticles.length === 0) {
        return await Article.find({ isActive: true })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-content');
      }

      // Get user's liked articles to analyze preferences
      const likedArticles = await Article.find({
        _id: { $in: user.behavior.likedArticles },
        isActive: true
      }).select('category tags');

      // Extract user preferences
      const categoryCounts = {};
      const tagCounts = {};

      likedArticles.forEach(article => {
        categoryCounts[article.category] = (categoryCounts[article.category] || 0) + 1;
        if (article.tags) {
          article.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      // Get top categories and tags
      const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category]) => category);

      const topTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([tag]) => tag);

      // Find articles matching user preferences
      const query = {
        isActive: true,
        _id: { $nin: user.behavior.likedArticles }
      };

      if (topCategories.length > 0 || topTags.length > 0) {
        query.$or = [];
        if (topCategories.length > 0) {
          query.$or.push({ category: { $in: topCategories } });
        }
        if (topTags.length > 0) {
          query.$or.push({ tags: { $in: topTags } });
        }
      }

      const articles = await Article.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-content');

      return articles;
    } catch (error) {
      console.error('Content-based filtering error:', error);
      return await Article.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-content');
    }
  }

  // Hybrid recommendations combining collaborative and content-based
  static async getHybridRecommendations(userId, limit = 10) {
    try {
      const [collaborativeRecs, contentRecs] = await Promise.all([
        this.getCollaborativeRecommendations(userId, Math.ceil(limit / 2)),
        this.getContentBasedRecommendations(userId, Math.ceil(limit / 2))
      ]);

      // Combine and deduplicate recommendations
      const allRecs = [...collaborativeRecs, ...contentRecs];
      const uniqueRecs = [];
      const seenIds = new Set();

      for (const article of allRecs) {
        if (!seenIds.has(article._id.toString())) {
          uniqueRecs.push(article);
          seenIds.add(article._id.toString());
        }
      }

      return uniqueRecs.slice(0, limit);
    } catch (error) {
      console.error('Hybrid recommendations error:', error);
      return await Article.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(limit)
        .select('-content');
    }
  }
}

module.exports = RecommendationService; 