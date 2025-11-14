
import React from 'react';
import { ChatWindow } from './components/ChatWindow';
import { SparklesIcon } from './components/Icons';

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto flex flex-col h-[calc(100vh-2rem)]">
        <header className="text-center mb-4 p-4 rounded-lg">
          <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            <SparklesIcon className="w-10 h-10" />
            Recipe Visualizer
          </h1>
          <p className="text-gray-400 mt-2">Pretvorite recepte u zapanjujuće slike i videozapise!</p>
        </header>
        <main className="flex-grow w-full">
          <ChatWindow />
        </main>
      </div>
    </div>
  );
};

export default App;
