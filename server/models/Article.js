const mongoose = require('mongoose');

const articleSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  url: {
    type: String,
    required: true,
    unique: true
  },
  source: {
    name: {
      type: String,
      required: true
    },
    domain: String,
    logo: String
  },
  category: {
    type: String,
    enum: ['technology', 'business', 'politics', 'sports', 'entertainment', 'science', 'health', 'world'],
    required: true
  },
  tags: [String],
  metadata: {
    author: String,
    publishedAt: Date,
    readingTime: Number, // in minutes
    wordCount: Number,
    sentiment: {
      type: String,
      enum: ['positive', 'negative', 'neutral'],
      default: 'neutral'
    },
    keywords: [String]
  },
  aiAnalysis: {
    summary: String,
    keyPoints: [String],
    sentiment: {
      score: Number,
      label: String
    },
    topics: [String],
    entities: [{
      name: String,
      type: String,
      relevance: Number
    }]
  },
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    dislikes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalRatings: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  scrapedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for efficient queries
articleSchema.index({ category: 1, publishedAt: -1 });
articleSchema.index({ 'source.name': 1 });
articleSchema.index({ tags: 1 });
articleSchema.index({ 'engagement.views': -1 });
articleSchema.index({ createdAt: -1 });

// Method to update engagement metrics
articleSchema.methods.updateEngagement = function(action, increment = 1) {
  switch (action) {
    case 'view':
      this.engagement.views += increment;
      break;
    case 'like':
      this.engagement.likes += increment;
      break;
    case 'dislike':
      this.engagement.dislikes += increment;
      break;
    case 'share':
      this.engagement.shares += increment;
      break;
    case 'rate':
      // This should be called with the new rating value
      break;
  }
  return this.save();
};

// Method to update average rating
articleSchema.methods.updateRating = function(newRating) {
  const currentTotal = this.engagement.averageRating * this.engagement.totalRatings;
  this.engagement.totalRatings += 1;
  this.engagement.averageRating = (currentTotal + newRating) / this.engagement.totalRatings;
  return this.save();
};

// Static method to get trending articles
articleSchema.statics.getTrending = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ 'engagement.views': -1, 'engagement.likes': -1 })
    .limit(limit);
};

// Static method to get articles by category
articleSchema.statics.getByCategory = function(category, limit = 20, skip = 0) {
  return this.find({ 
    category, 
    isActive: true 
  })
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(limit);
};

module.exports = mongoose.model('Article', articleSchema); 