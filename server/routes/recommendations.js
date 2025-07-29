const express = require('express');
const User = require('../models/User');
const Article = require('../models/Article');
const { authenticateToken } = require('../middleware/auth');
const AIService = require('../services/aiService');

const router = express.Router();

// Get personalized recommendations
router.get('/personalized', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const user = await User.findById(req.user.userId)
      .populate('behavior.likedArticles', 'category tags aiAnalysis')
      .populate('behavior.dislikedArticles', 'category tags aiAnalysis');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get available articles
    const availableArticles = await Article.find({ isActive: true })
      .select('title summary category tags aiAnalysis')
      .limit(50);

    // Generate AI-powered recommendations
    const recommendedArticleIds = await AIService.generatePersonalizedRecommendations(
      user.behavior,
      availableArticles
    );

    // Get recommended articles
    const recommendedArticles = await Article.find({
      _id: { $in: recommendedArticleIds },
      isActive: true
    })
    .select('-content')
    .limit(parseInt(limit));

    res.json({
      recommendations: recommendedArticles,
      count: recommendedArticles.length,
      algorithm: 'ai-powered'
    });
  } catch (error) {
    console.error('Personalized recommendations error:', error);
    res.status(500).json({ error: 'Failed to get personalized recommendations' });
  }
});

// Get collaborative filtering recommendations
router.get('/collaborative', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find users with similar preferences
    const similarUsers = await User.find({
      _id: { $ne: user._id },
      'preferences.categories': { $in: user.preferences.categories },
      'behavior.likedArticles': { $exists: true, $ne: [] }
    })
    .populate('behavior.likedArticles', 'category tags')
    .limit(10);

    // Get articles liked by similar users
    const similarUserLikedArticles = [];
    similarUsers.forEach(similarUser => {
      similarUser.behavior.likedArticles.forEach(article => {
        if (!user.behavior.likedArticles.includes(article._id) &&
            !user.behavior.dislikedArticles.includes(article._id)) {
          similarUserLikedArticles.push(article._id);
        }
      });
    });

    // Get most common articles
    const articleCounts = {};
    similarUserLikedArticles.forEach(articleId => {
      articleCounts[articleId] = (articleCounts[articleId] || 0) + 1;
    });

    const recommendedArticleIds = Object.entries(articleCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, parseInt(limit))
      .map(([articleId]) => articleId);

    const recommendedArticles = await Article.find({
      _id: { $in: recommendedArticleIds },
      isActive: true
    })
    .select('-content');

    res.json({
      recommendations: recommendedArticles,
      count: recommendedArticles.length,
      algorithm: 'collaborative-filtering'
    });
  } catch (error) {
    console.error('Collaborative recommendations error:', error);
    res.status(500).json({ error: 'Failed to get collaborative recommendations' });
  }
});

// Get content-based recommendations
router.get('/content-based', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const user = await User.findById(req.user.userId)
      .populate('behavior.likedArticles', 'category tags aiAnalysis');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Extract user's preferred categories and tags
    const userCategories = new Set();
    const userTags = new Set();

    user.behavior.likedArticles.forEach(article => {
      userCategories.add(article.category);
      if (article.tags) {
        article.tags.forEach(tag => userTags.add(tag));
      }
    });

    // Find articles with similar categories and tags
    const recommendedArticles = await Article.find({
      _id: { $nin: [...user.behavior.likedArticles, ...user.behavior.dislikedArticles] },
      isActive: true,
      $or: [
        { category: { $in: Array.from(userCategories) } },
        { tags: { $in: Array.from(userTags) } }
      ]
    })
    .select('-content')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      recommendations: recommendedArticles,
      count: recommendedArticles.length,
      algorithm: 'content-based'
    });
  } catch (error) {
    console.error('Content-based recommendations error:', error);
    res.status(500).json({ error: 'Failed to get content-based recommendations' });
  }
});

// Get trending recommendations
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    
    const trendingArticles = await Article.find({ isActive: true })
      .select('-content')
      .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
      .limit(parseInt(limit));

    res.json({
      recommendations: trendingArticles,
      count: trendingArticles.length,
      algorithm: 'trending'
    });
  } catch (error) {
    console.error('Trending recommendations error:', error);
    res.status(500).json({ error: 'Failed to get trending recommendations' });
  }
});

// Get category-based recommendations
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 10 } = req.query;
    
    const categoryArticles = await Article.find({
      category,
      isActive: true
    })
    .select('-content')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

    res.json({
      recommendations: categoryArticles,
      count: categoryArticles.length,
      algorithm: 'category-based',
      category
    });
  } catch (error) {
    console.error('Category recommendations error:', error);
    res.status(500).json({ error: 'Failed to get category recommendations' });
  }
});

// Get mixed recommendations (combines multiple algorithms)
router.get('/mixed', authenticateToken, async (req, res) => {
  try {
    const { limit = 15 } = req.query;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get recommendations from different algorithms
    const [personalized, trending, contentBased] = await Promise.all([
      this.getPersonalizedRecommendations(user, Math.ceil(limit / 3)),
      this.getTrendingRecommendations(Math.ceil(limit / 3)),
      this.getContentBasedRecommendations(user, Math.ceil(limit / 3))
    ]);

    // Combine and deduplicate recommendations
    const allRecommendations = [...personalized, ...trending, ...contentBased];
    const uniqueRecommendations = this.deduplicateRecommendations(allRecommendations);
    
    const mixedRecommendations = uniqueRecommendations.slice(0, parseInt(limit));

    res.json({
      recommendations: mixedRecommendations,
      count: mixedRecommendations.length,
      algorithm: 'mixed',
      breakdown: {
        personalized: personalized.length,
        trending: trending.length,
        contentBased: contentBased.length
      }
    });
  } catch (error) {
    console.error('Mixed recommendations error:', error);
    res.status(500).json({ error: 'Failed to get mixed recommendations' });
  }
});

// Helper methods for mixed recommendations
router.getPersonalizedRecommendations = async (user, limit) => {
  const availableArticles = await Article.find({ isActive: true })
    .select('title summary category tags aiAnalysis')
    .limit(50);

  const recommendedArticleIds = await AIService.generatePersonalizedRecommendations(
    user.behavior,
    availableArticles
  );

  return await Article.find({
    _id: { $in: recommendedArticleIds },
    isActive: true
  })
  .select('-content')
  .limit(limit);
};

router.getTrendingRecommendations = async (limit) => {
  return await Article.find({ isActive: true })
    .select('-content')
    .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
    .limit(limit);
};

router.getContentBasedRecommendations = async (user, limit) => {
  const userCategories = new Set();
  user.behavior.likedArticles.forEach(article => {
    userCategories.add(article.category);
  });

  return await Article.find({
    _id: { $nin: [...user.behavior.likedArticles, ...user.behavior.dislikedArticles] },
    isActive: true,
    category: { $in: Array.from(userCategories) }
  })
  .select('-content')
  .sort({ createdAt: -1 })
  .limit(limit);
};

router.deduplicateRecommendations = (recommendations) => {
  const seen = new Set();
  return recommendations.filter(article => {
    if (seen.has(article._id.toString())) {
      return false;
    }
    seen.add(article._id.toString());
    return true;
  });
};

module.exports = router; 