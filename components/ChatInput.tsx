
import React, { useState } from 'react';
import { SendIcon } from './Icons';

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  isLimitReached?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isLoading, isLimitReached = false }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText('');
    }
  };

  return (
    <div className="p-4 border-t border-gray-700 bg-gray-800 rounded-b-2xl">
      <form onSubmit={handleSubmit} className="flex items-center gap-4">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={isLimitReached ? "Dosegli ste ograničenje generiranja." : "Upišite svoj recept ovdje..."}
          className="flex-grow bg-gray-700 border border-gray-600 rounded-full py-3 px-5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 transition duration-200"
          disabled={isLoading || isLimitReached}
        />
        <button
          type="submit"
          disabled={isLoading || !text.trim() || isLimitReached}
          className="bg-purple-600 text-white rounded-full p-3 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-purple-500"
        >
          <SendIcon className="w-6 h-6" />
        </button>
      </form>
    </div>
  );
};