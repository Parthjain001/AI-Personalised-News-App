import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user) {
      // Create socket connection with authentication
      const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
        auth: {
          token: localStorage.getItem('token')
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Socket connected');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Socket disconnected');
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      // --- Remove all cron/manual scraping notifications ---
      // Remove: new_articles, trending_updated, etc.

      // --- Add handler for news data via websocket ---
      newSocket.on('news_data', (data) => {
        // You can use a global state, context, or callback to update articles in your UI
        // Example: toast or custom handler
        toast.success(`Fetched ${data.articles.length} articles via WebSocket!`);
        // Optionally, store articles in a state or context here
      });

      newSocket.on('news_error', (err) => {
        toast.error(err.error || 'Failed to fetch news');
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      // Disconnect socket if user is not authenticated
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
    // eslint-disable-next-line
  }, [isAuthenticated, user]);

  const emitEvent = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  // --- Add a helper to fetch news via websocket ---
  const fetchNews = () => {
    emitEvent('fetch_news');
  };

  // --- Add a helper to fetch recommendations via websocket ---
  const fetchRecommendations = (type = 'hybrid', limit = 10) => {
    emitEvent('fetch_recommendations', { type, limit });
  };

  // Remove or comment out all cron/manual scraping related helpers if any

  const value = {
    socket,
    connected,
    emitEvent,
    fetchNews, // <-- Add this to context
    fetchRecommendations, // <-- Add this to context
    // ...other helpers as needed
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};