import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';

const Profile = () => {
  const { user, updateProfile, updatePreferences } = useAuth();
  const { socket } = useSocket();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', email: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ username: user.username, email: user.email });
    }
  }, [user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setLoading(true);
    setMessage('');
    const res = await updateProfile(form);
    setLoading(false);
    if (res.success) {
      setEditing(false);
      setMessage('Profile updated!');
    } else {
      setMessage(res.error);
    }
  };

  if (!user) return <LoadingSpinner />;

  return (
    <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-6">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="mb-4">
        <label className="block text-sm font-medium">Username</label>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          disabled={!editing}
          className="input mt-1"
        />
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium">Email</label>
        <input
          name="email"
          value={form.email}
          onChange={handleChange}
          disabled={!editing}
          className="input mt-1"
        />
      </div>
      <div className="flex space-x-2 mb-4">
        {editing ? (
          <>
            <button onClick={handleSave} className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save'}</button>
            <button onClick={() => setEditing(false)} className="btn btn-secondary">Cancel</button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="btn btn-outline">Edit</button>
        )}
      </div>
      {message && <div className="text-green-600 mb-2">{message}</div>}
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Preferences</h2>
        <div className="mb-2">Categories: {user.preferences?.categories?.join(', ') || 'None'}</div>
        <div className="mb-2">Language: {user.preferences?.language}</div>
        <div className="mb-2">Reading Time: {user.preferences?.readingTime}</div>
        {/* Add more preference editing as needed */}
      </div>
      <div className="mt-6">
        <h2 className="font-semibold mb-2">Stats</h2>
        <div className="mb-2">Articles Read: {user.behavior?.readArticles?.length || 0}</div>
        <div className="mb-2">Likes: {user.behavior?.likedArticles?.length || 0}</div>
        <div className="mb-2">Dislikes: {user.behavior?.dislikedArticles?.length || 0}</div>
      </div>
    </div>
  );
};

export default Profile; 