
import React from 'react';
import type { Message } from '../types';
import { UserIcon, SparklesIcon } from './Icons';
import { LoadingSpinner } from './LoadingSpinner';

interface ChatMessageProps {
  message: Message;
  isLoading?: boolean;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, isLoading = false }) => {
  const isModel = message.role === 'model';

  const containerClasses = `flex items-start gap-4 max-w-3xl ${isModel ? 'justify-start' : 'justify-end ml-auto'}`;
  const bubbleClasses = `p-4 rounded-2xl max-w-full break-words ${isModel ? 'bg-gray-700 text-gray-200 rounded-tl-none' : 'bg-purple-600 text-white rounded-br-none'}`;
  const iconClasses = `w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${isModel ? 'bg-gray-600 text-purple-300' : 'bg-purple-400 text-white'}`;
  
  return (
    <div className={containerClasses}>
      {isModel && (
        <div className={iconClasses}>
          <SparklesIcon className="w-5 h-5" />
        </div>
      )}
      <div className={bubbleClasses}>
        {isLoading ? <LoadingSpinner /> : message.content}
      </div>
      {!isModel && (
        <div className={iconClasses}>
          <UserIcon className="w-5 h-5" />
        </div>
      )}
    </div>
  );
};
