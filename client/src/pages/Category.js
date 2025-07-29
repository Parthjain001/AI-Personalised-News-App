import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import ArticleCard from '../components/ArticleCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Category = () => {
  const { category } = useParams();
  const { fetchNews, socket, connected } = useSocket();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;
    const handleNewsData = (data) => {
      // Filter articles by category
      setArticles((data.articles || []).filter(a => a.category === category));
      setLoading(false);
    };
    const handleNewsError = () => setLoading(false);

    socket.on('news_data', handleNewsData);
    socket.on('news_error', handleNewsError);

    return () => {
      socket.off('news_data', handleNewsData);
      socket.off('news_error', handleNewsError);
    };
  }, [socket, category]);

  useEffect(() => {
    if (connected) {
      setLoading(true);
      fetchNews();
    }
    // eslint-disable-next-line
  }, [connected, category]);

  if (loading) return <LoadingSpinner />;
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 capitalize">{category} News</h1>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {articles.map(article => <ArticleCard key={article._id} article={article} />)}
      </div>
      {articles.length === 0 && <div className="text-gray-500 mt-8">No articles found in this category.</div>}
    </div>
  );
};

export default Category;