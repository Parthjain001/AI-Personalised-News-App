// const cron = require('node-cron');
// const ScrapingService = require('./scrapingService');
// const Article = require('../models/Article');

// class CronService {
//   static setupCronJobs() {
//     console.log('Setting up cron jobs...');

//     // Scrape news every 2 hours
//     cron.schedule('0 */2 * * *', async () => {
//       console.log('Running scheduled news scraping...');
//       try {
//         await ScrapingService.scrapeAndSave();
//         console.log('Scheduled news scraping completed successfully');
//       } catch (error) {
//         console.error('Scheduled news scraping failed:', error);
//       }
//     }, {
//       scheduled: true,
//       timezone: "America/New_York"
//     });

//     // Clean up old articles every day at 2 AM
//     cron.schedule('0 2 * * *', async () => {
//       console.log('Running scheduled cleanup...');
//       try {
//         const thirtyDaysAgo = new Date();
//         thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

//         const result = await Article.updateMany(
//           { 
//             createdAt: { $lt: thirtyDaysAgo },
//             'engagement.views': { $lt: 10 } // Keep articles with low engagement
//           },
//           { isActive: false }
//         );

//         console.log(`Cleanup completed: ${result.modifiedCount} articles deactivated`);
//       } catch (error) {
//         console.error('Scheduled cleanup failed:', error);
//       }
//     }, {
//       scheduled: true,
//       timezone: "America/New_York"
//     });

//     // Update trending scores every hour
//     cron.schedule('0 * * * *', async () => {
//       console.log('Updating trending scores...');
//       try {
//         // Calculate trending scores based on recent engagement
//         const articles = await Article.find({ isActive: true });
        
//         for (const article of articles) {
//           const recentViews = article.engagement.views;
//           const recentLikes = article.engagement.likes;
//           const timeSincePublished = Date.now() - article.createdAt.getTime();
          
//           // Simple trending algorithm: (views + likes * 2) / hours_since_published
//           const hoursSincePublished = timeSincePublished / (1000 * 60 * 60);
//           const trendingScore = hoursSincePublished > 0 ? 
//             (recentViews + recentLikes * 2) / hoursSincePublished : 0;
          
//           // Store trending score in a custom field if needed
//           article.trendingScore = trendingScore;
//           await article.save();
//         }

//         console.log('Trending scores updated successfully');
//       } catch (error) {
//         console.error('Trending score update failed:', error);
//       }
//     }, {
//       scheduled: true,
//       timezone: "America/New_York"
//     });

//     // Backup database stats every day at 3 AM
//     cron.schedule('0 3 * * *', async () => {
//       console.log('Running database stats backup...');
//       try {
//         const stats = {
//           totalArticles: await Article.countDocuments(),
//           activeArticles: await Article.countDocuments({ isActive: true }),
//           totalViews: await Article.aggregate([
//             { $group: { _id: null, total: { $sum: '$engagement.views' } } }
//           ]),
//           totalLikes: await Article.aggregate([
//             { $group: { _id: null, total: { $sum: '$engagement.likes' } } }
//           ]),
//           categoryStats: await Article.aggregate([
//             { $group: { _id: '$category', count: { $sum: 1 } } }
//           ]),
//           timestamp: new Date()
//         };

//         console.log('Database stats:', stats);
//         // You could save these stats to a separate collection or file
//       } catch (error) {
//         console.error('Database stats backup failed:', error);
//       }
//     }, {
//       scheduled: true,
//       timezone: "America/New_York"
//     });

//     console.log('Cron jobs scheduled successfully');
//   }

//   static async runInitialScraping() {
//     console.log('Running initial news scraping...');
//     try {
//       await ScrapingService.scrapeAndSave();
//       console.log('Initial scraping completed');
//     } catch (error) {
//       console.error('Initial scraping failed:', error);
//     }
//   }

//   static stopAllJobs() {
//     console.log('Stopping all cron jobs...');
//     cron.getTasks().forEach(task => task.stop());
//   }
// }

// module.exports = CronService; 