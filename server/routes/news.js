const express = require('express');
const Article = require('../models/Article');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { generateSummary } = require('../services/aiService');
const { scrapeNews } = require('../services/scrapingService');

const router = express.Router();

// Get all articles with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, category, search, sort = 'latest' } = req.query;
    const skip = (page - 1) * limit;

    let query = { isActive: true };
    
    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    let sortOption = {};
    switch (sort) {
      case 'trending':
        sortOption = { 'engagement.views': -1, 'engagement.likes': -1 };
        break;
      case 'popular':
        sortOption = { 'engagement.likes': -1, 'engagement.views': -1 };
        break;
      default:
        sortOption = { createdAt: -1 };
    }

    const articles = await Article.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content'); // Don't send full content in list

    const total = await Article.countDocuments(query);

    res.json({
      articles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNext: skip + articles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get articles error:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
});

// Get single article by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);

    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update view count
    await article.updateEngagement('view');

    res.json({ article });
  } catch (error) {
    console.error('Get article error:', error);
    res.status(500).json({ error: 'Failed to fetch article' });
  }
});

// Get personalized feed for authenticated user
router.get('/feed/personalized', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Build query based on user preferences
    let query = { isActive: true };
    
    if (user.preferences.categories && user.preferences.categories.length > 0) {
      query.category = { $in: user.preferences.categories };
    }

    if (user.preferences.sources && user.preferences.sources.length > 0) {
      query['source.name'] = { $in: user.preferences.sources };
    }

    // Get articles based on preferences
    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content');

    const total = await Article.countDocuments(query);

    res.json({
      articles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNext: skip + articles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Personalized feed error:', error);
    res.status(500).json({ error: 'Failed to fetch personalized feed' });
  }
});

// Get trending articles
router.get('/trending', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    // Example: sort by views or likes to get trending articles
    const articles = await Article.find({})
      .sort({ views: -1 }) // or likes: -1
      .limit(limit);
    res.json(articles);
  } catch (error) {
    console.error('Trending articles error:', error);
    res.status(500).json({ error: 'Failed to fetch trending articles' });
  }
});

// Get articles by category
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const articles = await Article.getByCategory(category, parseInt(limit), skip);
    const total = await Article.countDocuments({ category, isActive: true });

    res.json({
      articles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNext: skip + articles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Category articles error:', error);
    res.status(500).json({ error: 'Failed to fetch category articles' });
  }
});

// Like an article
router.post('/:id/like', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update article engagement
    await article.updateEngagement('like');

    // Update user behavior
    const user = await User.findById(req.user.userId);
    await user.updateBehavior('like', { articleId: id });

    res.json({ message: 'Article liked successfully' });
  } catch (error) {
    console.error('Like article error:', error);
    res.status(500).json({ error: 'Failed to like article' });
  }
});

// Dislike an article
router.post('/:id/dislike', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const article = await Article.findById(id);
    
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update article engagement
    await article.updateEngagement('dislike');

    // Update user behavior
    const user = await User.findById(req.user.userId);
    await user.updateBehavior('dislike', { articleId: id });

    res.json({ message: 'Article disliked successfully' });
  } catch (error) {
    console.error('Dislike article error:', error);
    res.status(500).json({ error: 'Failed to dislike article' });
  }
});

// Rate an article
router.post('/:id/rate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: 'Article not found' });
    }

    // Update article rating
    await article.updateRating(rating);

    // Update user behavior
    const user = await User.findById(req.user.userId);
    await user.updateBehavior('read', { 
      articleId: id, 
      rating: rating 
    });

    res.json({ message: 'Article rated successfully' });
  } catch (error) {
    console.error('Rate article error:', error);
    res.status(500).json({ error: 'Failed to rate article' });
  }
});

// Search articles
router.get('/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }

    const query = {
      isActive: true,
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { content: { $regex: q, $options: 'i' } },
        { tags: { $in: [new RegExp(q, 'i')] } },
        { 'aiAnalysis.topics': { $in: [new RegExp(q, 'i')] } }
      ]
    };

    const articles = await Article.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-content');

    const total = await Article.countDocuments(query);

    res.json({
      articles,
      query: q,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalArticles: total,
        hasNext: skip + articles.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Search articles error:', error);
    res.status(500).json({ error: 'Failed to search articles' });
  }
});

// Manual news scraping (admin endpoint)
// router.post('/scrape', authenticateToken, async (req, res) => {
//   try {
//     // Check if user is admin (you can implement admin role later)
//     const scrapedArticles = await scrapeNews();
    
//     res.json({ 
//       message: 'News scraping completed',
//       articlesScraped: scrapedArticles.length
//     });
//   } catch (error) {
//     console.error('News scraping error:', error);
//     res.status(500).json({ error: 'Failed to scrape news' });
//   }
// });

module.exports = router;