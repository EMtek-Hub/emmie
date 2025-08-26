import { useState, useEffect } from 'react';
import { requireHubAuth } from '../lib/authz';

export default function ChatTestPage({ session }) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim()) {
      setMessages(prev => [...prev, { role: 'user', content: message, id: Date.now() }]);
      setMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Chat Test Page</h1>
        <p className="mb-4">User: {session?.user?.email || 'Unknown'}</p>
        
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4 min-h-[400px]">
          {messages.length === 0 ? (
            <p className="text-gray-500">No messages yet. Send one below!</p>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="p-3 bg-blue-50 rounded-lg">
                  <strong>{msg.role}:</strong> {msg.content}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a test message..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export async function getServerSideProps(context) {
  const authResult = await requireHubAuth(context, process.env.TOOL_SLUG);
  
  if (authResult.redirect) {
    return authResult;
  }
  
  return {
    props: {
      session: authResult.props.session,
    },
  };
}
