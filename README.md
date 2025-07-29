# AI News Platform

A real-time news aggregation platform with AI-powered summarization, analysis, and personalized recommendations using collaborative filtering.

## Features

- **Real-time News Fetching**: Get latest news from News API with WebSocket support
- **AI Summarization**: OpenAI-powered article summarization and analysis
- **Collaborative Filtering**: Personalized recommendations based on user behavior
- **Real-time Updates**: WebSocket-based real-time communication
- **User Authentication**: JWT-based authentication system
- **Responsive UI**: Modern React frontend with Tailwind CSS

## Tech Stack

### Backend
- **Node.js** with Express
- **Socket.IO** for real-time communication
- **MongoDB** with Mongoose
- **OpenAI API** for AI features
- **News API** for news aggregation

### Frontend
- **React** with Hooks and Context API
- **Tailwind CSS** for styling
- **Socket.IO Client** for real-time features
- **Lucide React** for icons

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- OpenAI API key
- News API key

## Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd shopify
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install client dependencies
   cd client
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your actual values
   nano .env
   ```

4. **Configure Environment Variables**
   
   Create a `.env` file in the root directory with the following variables:
   
   ```env
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # MongoDB Configuration
   MONGODB_URI=mongodb://localhost:27017/ai-news-platform
   
   # JWT Configuration
   JWT_SECRET=your_secure_jwt_secret_here
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   
   # News API Configuration
   NEWS_API_KEY=your_news_api_key_here
   
   # Client Configuration
   REACT_APP_SOCKET_URL=http://localhost:5000
   ```

## Running the Application

### Development Mode

```bash
# Start both server and client concurrently
npm run dev

# Or run them separately:
# Terminal 1 - Start server
npm run server

# Terminal 2 - Start client
npm run client
```

### Production Mode

```bash
# Build the client
cd client
npm run build
cd ..

# Start the server
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile

### News
- `GET /api/news` - Get all articles
- `GET /api/news/feed/personalized` - Get personalized feed

### Recommendations
- `GET /api/recommendations/personalized` - Get personalized recommendations

## WebSocket Events

### Client to Server
- `fetch_news` - Request latest news
- `fetch_recommendations` - Request personalized recommendations
- `article_view` - Track article view
- `article_like` - Like an article
- `article_dislike` - Dislike an article

### Server to Client
- `news_data` - Latest news data
- `recommendations_data` - Personalized recommendations
- `article_liked` - Article liked notification
- `article_disliked` - Article disliked notification

## Project Structure

```
shopify/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   └── ...
│   └── ...
├── server/                 # Node.js backend
│   ├── models/             # Mongoose models
│   ├── routes/             # Express routes
│   ├── services/           # Business logic
│   ├── middleware/         # Express middleware
│   └── ...
├── .gitignore             # Git ignore rules
├── env.example            # Environment variables template
└── README.md              # This file
```

## Features in Detail

### AI-Powered News Analysis
- Automatic article summarization using OpenAI
- Sentiment analysis and entity extraction
- Keyword extraction for better categorization

### Collaborative Filtering
- User-based collaborative filtering
- Content-based filtering using categories and tags
- Hybrid recommendations combining both approaches

### Real-time Features
- Live news updates via WebSocket
- Real-time user interactions (likes, views)
- Instant recommendation updates

## Deployment

### Environment Variables for Production
Make sure to set these environment variables in your production environment:

```env
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
JWT_SECRET=your_secure_production_jwt_secret
OPENAI_API_KEY=your_openai_api_key
NEWS_API_KEY=your_news_api_key
REACT_APP_SOCKET_URL=your_production_socket_url
```

### Deployment Platforms
- **Heroku**: Use the Procfile and set environment variables
- **Vercel**: Deploy frontend and backend separately
- **AWS**: Use EC2 or Elastic Beanstalk
- **DigitalOcean**: Use App Platform or Droplets

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@example.com or create an issue in the repository. 