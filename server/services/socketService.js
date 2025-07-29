const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ScrapingService = require('./scrapingService');
const RecommendationService = require('./recommendationService');

class SocketService {
  static broadcastNewArticles(io, articles) {
    io.emit('new_articles', { articles });
  }

  static setupSocketHandlers(io) {
    console.log('Setting up Socket.IO handlers...');

    // Authentication middleware
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
        
        if (!token) {
          return next(new Error('Authentication error'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.userId);
        
        if (!user) {
          return next(new Error('User not found'));
        }

        socket.userId = decoded.userId;
        socket.user = user;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`User ${socket.userId} connected`);

      // Join user to their personal room
      socket.join(`user_${socket.userId}`);

      // Handle article view tracking
      socket.on('article_view', async (data) => {
        try {
          const { articleId, timeSpent } = data;
          
          // Update user behavior
          await socket.user.updateBehavior('read', {
            articleId,
            timeSpent: timeSpent || 0
          });

          // Emit to other users viewing the same article
          socket.to(`article_${articleId}`).emit('article_viewed', {
            articleId,
            userId: socket.userId
          });

          // Join article room for real-time updates
          socket.join(`article_${articleId}`);
        } catch (error) {
          console.error('Article view tracking error:', error);
        }
      });

      // Handle article like/dislike
      socket.on('article_like', async (data) => {
        try {
          const { articleId } = data;
          
          await socket.user.updateBehavior('like', { articleId });
          
          // Emit to all users
          io.emit('article_liked', {
            articleId,
            userId: socket.userId,
            username: socket.user.username
          });
        } catch (error) {
          console.error('Article like error:', error);
        }
      });

      socket.on('article_dislike', async (data) => {
        try {
          const { articleId } = data;
          
          await socket.user.updateBehavior('dislike', { articleId });
          
          // Emit to all users
          io.emit('article_disliked', {
            articleId,
            userId: socket.userId,
            username: socket.user.username
          });
        } catch (error) {
          console.error('Article dislike error:', error);
        }
      });

      // Handle search queries
      socket.on('search_query', async (data) => {
        try {
          const { query } = data;
          
          await socket.user.updateBehavior('search', { query });
          
          // Emit search analytics to admin (if needed)
          socket.to('admin_room').emit('search_analytics', {
            query,
            userId: socket.userId,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Search query error:', error);
        }
      });

      // Handle user preferences update
      socket.on('preferences_update', async (data) => {
        try {
          const { preferences } = data;
          
          socket.user.preferences = { ...socket.user.preferences, ...preferences };
          await socket.user.save();
          
          // Emit updated preferences to user
          socket.emit('preferences_updated', socket.user.preferences);
        } catch (error) {
          console.error('Preferences update error:', error);
        }
      });

      // Handle real-time chat (if implemented)
      socket.on('join_chat', (data) => {
        const { roomId } = data;
        socket.join(`chat_${roomId}`);
        socket.to(`chat_${roomId}`).emit('user_joined_chat', {
          userId: socket.userId,
          username: socket.user.username
        });
      });

      socket.on('chat_message', (data) => {
        const { roomId, message } = data;
        socket.to(`chat_${roomId}`).emit('new_chat_message', {
          userId: socket.userId,
          username: socket.user.username,
          message,
          timestamp: new Date()
        });
      });

      // Handle typing indicators
      socket.on('typing_start', (data) => {
        const { roomId } = data;
        socket.to(`chat_${roomId}`).emit('user_typing', {
          userId: socket.userId,
          username: socket.user.username
        });
      });

      socket.on('typing_stop', (data) => {
        const { roomId } = data;
        socket.to(`chat_${roomId}`).emit('user_stopped_typing', {
          userId: socket.userId
        });
      });

      // Handle fetching recommendations via WebSocket
      socket.on('fetch_recommendations', async (data) => {
        try {
          const { type = 'hybrid', limit = 10 } = data || {};
          let articles;

          switch (type) {
            case 'collaborative':
              articles = await RecommendationService.getCollaborativeRecommendations(socket.userId, limit);
              break;
            case 'content':
              articles = await RecommendationService.getContentBasedRecommendations(socket.userId, limit);
              break;
            case 'hybrid':
            default:
              articles = await RecommendationService.getHybridRecommendations(socket.userId, limit);
              break;
          }

          socket.emit('recommendations_data', { articles, type });
        } catch (error) {
          console.error('Recommendations error:', error);
          socket.emit('recommendations_error', { error: 'Failed to fetch recommendations' });
        }
      });

      // Handle fetching news via WebSocket
      socket.on('fetch_news', async (data) => {
        try {
          // 1. Immediately send current articles
          const Article = require('../models/Article');
          const articles = await Article.find({}).sort({ scrapedAt: -1 }).limit(50);
          socket.emit('news_data', { articles });

          // 2. In the background, fetch new articles and update DB
          ScrapingService.fetchFromNewsAPI().then(async () => {
            const updatedArticles = await Article.find({}).sort({ scrapedAt: -1 }).limit(50);
            socket.emit('news_data', { articles: updatedArticles });
          });
        } catch (error) {
          socket.emit('news_error', { error: 'Failed to fetch news' });
        }
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        
        // Leave all rooms
        socket.rooms.forEach(room => {
          if (room !== socket.id) {
            socket.leave(room);
          }
        });
      });
    });

    console.log('Socket.IO handlers configured successfully');
  }

  // Method to get connected users count
  static getConnectedUsersCount(io) {
    return io.engine.clientsCount;
  }

  // Method to get all connected user IDs
  static getConnectedUserIds(io) {
    const userIds = [];
    io.sockets.sockets.forEach((socket) => {
      if (socket.userId) {
        userIds.push(socket.userId);
      }
    });
    return userIds;
  }
}

module.exports = SocketService;