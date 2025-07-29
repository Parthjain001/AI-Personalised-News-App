import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ArticleCard from '../components/ArticleCard';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  TrendingUp, 
  Sparkles, 
  RefreshCw,
  Filter,
  Grid,
  List,
  Heart
} from 'lucide-react';

const Home = () => {
  const { user } = useAuth();
  const { fetchNews, fetchRecommendations, socket, connected } = useSocket();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('latest');
  const [activeTab, setActiveTab] = useState('personalized');

  // Listen for news_data and recommendations_data from socket
  useEffect(() => {
    if (!socket) return;
    
    const handleNewsData = (data) => {
      setArticles(data.articles || []);
      setLoading(false);
    };
    
    const handleRecommendationsData = (data) => {
      setArticles(data.articles || []);
      setLoading(false);
    };
    
    const handleNewsError = () => setLoading(false);
    const handleRecommendationsError = () => setLoading(false);

    socket.on('news_data', handleNewsData);
    socket.on('recommendations_data', handleRecommendationsData);
    socket.on('news_error', handleNewsError);
    socket.on('recommendations_error', handleRecommendationsError);

    return () => {
      socket.off('news_data', handleNewsData);
      socket.off('recommendations_data', handleRecommendationsData);
      socket.off('news_error', handleNewsError);
      socket.off('recommendations_error', handleRecommendationsError);
    };
  }, [socket]);

  // Fetch data on mount or when user logs in
  useEffect(() => {
    if (connected) {
      setLoading(true);
      if (activeTab === 'recommendations' && user) {
        fetchRecommendations('hybrid', 20);
      } else {
        fetchNews();
      }
    }
    // eslint-disable-next-line
  }, [connected, user, activeTab]);

  const tabs = [
    { id: 'personalized', name: 'For You', icon: Sparkles, show: !!user },
    { id: 'recommendations', name: 'Recommended', icon: Heart, show: !!user },
    { id: 'trending', name: 'Trending', icon: TrendingUp, show: true },
    { id: 'latest', name: 'Latest', icon: RefreshCw, show: true },
  ];

  const sortOptions = [
    { value: 'latest', label: 'Latest' },
    { value: 'trending', label: 'Trending' },
    { value: 'popular', label: 'Popular' },
  ];

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setLoading(true);
    if (tabId === 'recommendations' && user) {
      fetchRecommendations('hybrid', 20);
    } else {
      fetchNews();
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {activeTab === 'recommendations' ? 'Recommended for You' :
             user ? 'Your Personalized Feed' : 'Latest News'}
          </h1>
          <p className="text-gray-600 mt-2">
            {activeTab === 'recommendations' 
              ? 'AI-powered recommendations based on your interests and similar users'
              : user 
                ? 'AI-curated articles based on your interests and reading history'
                : 'Stay informed with the latest news from around the world'
            }
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-4">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-primary-600 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="input py-2 px-3 text-sm"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.filter(tab => tab.show).map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <div className={`grid gap-6 ${
          viewMode === 'grid' 
            ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' 
            : 'grid-cols-1'
        }`}>
          {articles.map((article) => (
            <ArticleCard
              key={article._id}
              article={article}
              className={viewMode === 'list' ? 'flex flex-col md:flex-row md:items-center' : ''}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">
            {activeTab === 'recommendations' 
              ? 'No recommendations available yet. Try liking some articles to get personalized recommendations!'
              : 'No articles available at the moment.'
            }
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;