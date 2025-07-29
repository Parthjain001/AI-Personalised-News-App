import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { Clock, ExternalLink, ThumbsUp, ThumbsDown, Share2, ArrowLeft } from 'lucide-react';

const ArticleDetail = () => {
  const { id } = useParams();
  const { socket, likeArticle, dislikeArticle, trackArticleView } = useSocket();
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchArticle = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`/api/news/${id}`);
        setArticle(response.data.article);
      } catch (err) {
        setError('Failed to load article.');
      } finally {
        setLoading(false);
      }
    };
    fetchArticle();
  }, [id]);

  useEffect(() => {
    if (article && socket) {
      trackArticleView(article._id);
    }
    // eslint-disable-next-line
  }, [article, socket]);

  const handleLike = () => {
    likeArticle(article._id);
    setIsLiked(true);
    setIsDisliked(false);
  };

  const handleDislike = () => {
    dislikeArticle(article._id);
    setIsDisliked(true);
    setIsLiked(false);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: article.title,
        text: article.summary,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) return <LoadingSpinner size="lg" />;
  if (error) return <div className="text-red-600">{error}</div>;
  if (!article) return <div>Article not found.</div>;

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow p-6">
      <Link to="/" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to Feed
      </Link>
      <h1 className="text-3xl font-bold mb-2">{article.title}</h1>
      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
        <span>{article.source?.name}</span>
        <span>|</span>
        <span>{new Date(article.createdAt).toLocaleString()}</span>
        <span>|</span>
        <span className="flex items-center"><Clock className="h-4 w-4 mr-1" />{article.metadata?.readingTime || 3} min read</span>
      </div>
      <div className="mb-4 text-gray-700 whitespace-pre-line">
        {article.content}
      </div>
      <div className="mb-4">
        <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-primary-600 flex items-center">
          <ExternalLink className="h-4 w-4 mr-1" /> Read Original
        </a>
      </div>
      <div className="flex items-center space-x-4 mb-4">
        <button onClick={handleLike} className={`p-2 rounded-full ${isLiked ? 'bg-red-100 text-red-600' : 'text-gray-500 hover:text-red-600'}`}><ThumbsUp className="h-5 w-5" /></button>
        <button onClick={handleDislike} className={`p-2 rounded-full ${isDisliked ? 'bg-gray-200 text-gray-600' : 'text-gray-500 hover:text-gray-600'}`}><ThumbsDown className="h-5 w-5" /></button>
        <button onClick={handleShare} className="p-2 rounded-full text-gray-500 hover:text-primary-600"><Share2 className="h-5 w-5" /></button>
      </div>
      {article.aiAnalysis && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold mb-2">AI Analysis</h3>
          <div className="mb-2"><span className="font-medium">Summary:</span> {article.aiAnalysis.summary}</div>
          <div className="mb-2"><span className="font-medium">Key Points:</span> <ul className="list-disc ml-6 text-sm">{article.aiAnalysis.keyPoints?.map((pt, i) => <li key={i}>{pt}</li>)}</ul></div>
          <div className="mb-2"><span className="font-medium">Sentiment:</span> {article.aiAnalysis.sentiment?.label} ({article.aiAnalysis.sentiment?.score})</div>
          <div className="mb-2"><span className="font-medium">Topics:</span> {article.aiAnalysis.topics?.join(', ')}</div>
        </div>
      )}
    </div>
  );
};

export default ArticleDetail; 