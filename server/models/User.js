const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  preferences: {
    categories: [{
      type: String,
      enum: ['technology', 'business', 'politics', 'sports', 'entertainment', 'science', 'health', 'world']
    }],
    sources: [String],
    language: {
      type: String,
      default: 'en'
    },
    readingTime: {
      type: String,
      enum: ['quick', 'detailed'],
      default: 'quick'
    }
  },
  behavior: {
    readArticles: [{
      articleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Article'
      },
      readAt: {
        type: Date,
        default: Date.now
      },
      timeSpent: Number,
      rating: {
        type: Number,
        min: 1,
        max: 5
      }
    }],
    likedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }],
    dislikedArticles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Article'
    }],
    searchHistory: [{
      query: String,
      timestamp: {
        type: Date,
        default: Date.now
      }
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to update user behavior
userSchema.methods.updateBehavior = function(action, data) {
  switch (action) {
    case 'read':
      this.behavior.readArticles.push({
        articleId: data.articleId,
        timeSpent: data.timeSpent,
        rating: data.rating
      });
      break;
    case 'like':
      if (!this.behavior.likedArticles.includes(data.articleId)) {
        this.behavior.likedArticles.push(data.articleId);
      }
      // Remove from disliked if present
      this.behavior.dislikedArticles = this.behavior.dislikedArticles.filter(
        id => id.toString() !== data.articleId.toString()
      );
      break;
    case 'dislike':
      if (!this.behavior.dislikedArticles.includes(data.articleId)) {
        this.behavior.dislikedArticles.push(data.articleId);
      }
      // Remove from liked if present
      this.behavior.likedArticles = this.behavior.likedArticles.filter(
        id => id.toString() !== data.articleId.toString()
      );
      break;
    case 'search':
      this.behavior.searchHistory.push({
        query: data.query
      });
      break;
  }
  return this.save();
};

module.exports = mongoose.model('User', userSchema); 