import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { 
  Heart, 
  MessageSquare, 
  Share2, 
  Clock, 
  ExternalLink,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ArticleCard = ({ article, showSummary = true, className = '' }) => {
  const { user } = useAuth();
  const { likeArticle, dislikeArticle } = useSocket();
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (isLiked) {
        setIsLiked(false);
      } else {
        setIsLiked(true);
        setIsDisliked(false);
      }
      likeArticle(article._id);
    } catch (error) {
      console.error('Error liking article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (isDisliked) {
        setIsDisliked(false);
      } else {
        setIsDisliked(true);
        setIsLiked(false);
      }
      dislikeArticle(article._id);
    } catch (error) {
      console.error('Error disliking article:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: article.url,
      });
    } else {
      navigator.clipboard.writeText(article.url);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      technology: 'bg-blue-100 text-blue-800',
      business: 'bg-green-100 text-green-800',
      politics: 'bg-red-100 text-red-800',
      sports: 'bg-orange-100 text-orange-800',
      entertainment: 'bg-purple-100 text-purple-800',
      science: 'bg-indigo-100 text-indigo-800',
      health: 'bg-pink-100 text-pink-800',
      world: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.world;
  };

  return (
    <article className={`card p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className={`badge ${getCategoryColor(article.category)}`}>
              {article.category}
            </span>
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(article.createdAt), { addSuffix: true })}
            </span>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2 line-clamp-2">
            <Link 
              to={`/article/${article._id}`}
              className="hover:text-primary-600 transition-colors"
            >
              {article.title}
            </Link>
          </h3>
        </div>
      </div>

      {/* Summary */}
      {showSummary && article.summary && (
        <p className="text-gray-600 mb-4 line-clamp-3">
          {article.summary}
        </p>
      )}

      {/* Source and Metadata */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            <span>{article.metadata?.readingTime || 3} min read</span>
          </div>
          <span className="text-sm text-gray-500">
            {article.source?.name}
          </span>
        </div>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:text-primary-700 text-sm font-medium flex items-center space-x-1"
        >
          <span>Read Original</span>
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <span>{article.engagement?.views || 0} views</span>
          <span>{article.engagement?.likes || 0} likes</span>
          {article.engagement?.averageRating > 0 && (
            <span>★ {article.engagement.averageRating.toFixed(1)}</span>
          )}
        </div>

        {/* Action Buttons */}
        {user && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleLike}
              disabled={isLoading}
              className={`p-2 rounded-full transition-colors ${
                isLiked 
                  ? 'text-red-500 bg-red-50' 
                  : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <ThumbsUp className="h-4 w-4" />
            </button>
            <button
              onClick={handleDislike}
              disabled={isLoading}
              className={`p-2 rounded-full transition-colors ${
                isDisliked 
                  ? 'text-gray-500 bg-gray-50' 
                  : 'text-gray-400 hover:text-gray-500 hover:bg-gray-50'
              }`}
            >
              <ThumbsDown className="h-4 w-4" />
            </button>
            <button
              onClick={handleShare}
              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      {/* AI Analysis Badge */}
      {article.aiAnalysis && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">AI Analysis:</span>
            <span className={`badge ${
              article.aiAnalysis.sentiment?.label === 'positive' 
                ? 'badge-success' 
                : article.aiAnalysis.sentiment?.label === 'negative'
                ? 'badge-error'
                : 'badge-secondary'
            }`}>
              {article.aiAnalysis.sentiment?.label || 'neutral'}
            </span>
            {article.aiAnalysis.topics?.slice(0, 2).map((topic, index) => (
              <span key={index} className="badge badge-primary text-xs">
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default ArticleCard; 