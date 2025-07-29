const express = require('express');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('behavior.readArticles.articleId', 'title category')
      .populate('behavior.likedArticles', 'title category')
      .populate('behavior.dislikedArticles', 'title category');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if username/email already exists
    if (username && username !== user.username) {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: 'Username already taken' });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already taken' });
      }
      user.email = email;
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferences: user.preferences
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user reading history
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user.userId)
      .populate({
        path: 'behavior.readArticles.articleId',
        select: 'title summary category source createdAt'
      });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const history = user.behavior.readArticles
      .sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
      .slice(skip, skip + parseInt(limit));

    const total = user.behavior.readArticles.length;

    res.json({
      history,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        hasNext: skip + history.length < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: 'Failed to get reading history' });
  }
});

// Get user preferences
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ preferences: user.preferences });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

// Update user preferences
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const { categories, sources, language, readingTime } = req.body;
    
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update preferences
    if (categories !== undefined) user.preferences.categories = categories;
    if (sources !== undefined) user.preferences.sources = sources;
    if (language !== undefined) user.preferences.language = language;
    if (readingTime !== undefined) user.preferences.readingTime = readingTime;

    await user.save();

    res.json({
      message: 'Preferences updated successfully',
      preferences: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('behavior.readArticles.articleId', 'category')
      .populate('behavior.likedArticles', 'category')
      .populate('behavior.dislikedArticles', 'category');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate statistics
    const totalArticlesRead = user.behavior.readArticles.length;
    const totalLikes = user.behavior.likedArticles.length;
    const totalDislikes = user.behavior.dislikedArticles.length;
    const totalSearches = user.behavior.searchHistory.length;

    // Category preferences
    const categoryStats = {};
    user.behavior.readArticles.forEach(read => {
      if (read.articleId && read.articleId.category) {
        categoryStats[read.articleId.category] = (categoryStats[read.articleId.category] || 0) + 1;
      }
    });

    // Average reading time
    const totalReadingTime = user.behavior.readArticles.reduce((sum, read) => sum + (read.timeSpent || 0), 0);
    const averageReadingTime = totalArticlesRead > 0 ? totalReadingTime / totalArticlesRead : 0;

    // Recent activity
    const recentActivity = user.behavior.readArticles
      .sort((a, b) => new Date(b.readAt) - new Date(a.readAt))
      .slice(0, 5);

    res.json({
      stats: {
        totalArticlesRead,
        totalLikes,
        totalDislikes,
        totalSearches,
        averageReadingTime: Math.round(averageReadingTime),
        categoryStats,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Clear user history
router.delete('/history', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.behavior.readArticles = [];
    user.behavior.likedArticles = [];
    user.behavior.dislikedArticles = [];
    user.behavior.searchHistory = [];

    await user.save();

    res.json({ message: 'History cleared successfully' });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

// Export user data
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .populate('behavior.readArticles.articleId', 'title summary category source')
      .populate('behavior.likedArticles', 'title summary category source')
      .populate('behavior.dislikedArticles', 'title summary category source');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const exportData = {
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        preferences: user.preferences,
        createdAt: user.createdAt
      },
      behavior: {
        readArticles: user.behavior.readArticles,
        likedArticles: user.behavior.likedArticles,
        dislikedArticles: user.behavior.dislikedArticles,
        searchHistory: user.behavior.searchHistory
      },
      exportDate: new Date().toISOString()
    };

    res.json({ data: exportData });
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

module.exports = router; 