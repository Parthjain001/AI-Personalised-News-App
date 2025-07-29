import React, { useState, useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';
import ArticleCard from '../components/ArticleCard';
import LoadingSpinner from '../components/LoadingSpinner';

const Search = () => {
  const { fetchNews, socket, connected } = useSocket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleNewsData = (data) => {
      // Filter articles by search query
      setResults(
        (data.articles || []).filter(
          a =>
            a.title?.toLowerCase().includes(query.toLowerCase()) ||
            a.content?.toLowerCase().includes(query.toLowerCase())
        )
      );
      setLoading(false);
      setSearched(true);
    };
    const handleNewsError = () => {
      setResults([]);
      setLoading(false);
      setSearched(true);
    };

    socket.on('news_data', handleNewsData);
    socket.on('news_error', handleNewsError);

    return () => {
      socket.off('news_data', handleNewsData);
      socket.off('news_error', handleNewsError);
    };
  }, [socket, query]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(false);
    fetchNews();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <form onSubmit={handleSearch} className="flex mb-6">
        <input
          type="text"
          className="input flex-1 mr-2"
          placeholder="Search articles..."
          value={query}
          onChange={e => setQuery(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Search</button>
      </form>
      {loading && <LoadingSpinner />}
      {searched && results.length === 0 && !loading && <div className="text-gray-500">No results found.</div>}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        {results.map(article => <ArticleCard key={article._id} article={article} />)}
      </div>
    </div>
  );
};

export default Search;