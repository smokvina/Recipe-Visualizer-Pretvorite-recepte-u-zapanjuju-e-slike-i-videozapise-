
import React from 'react';
import { DownloadIcon } from './Icons';

interface VideoResultProps {
  videoUrl: string;
  recipeName: string;
}

export const VideoResult: React.FC<VideoResultProps> = ({ videoUrl, recipeName }) => {
  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    const fileName = `${recipeName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.mp4`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative group max-w-sm">
      <video src={videoUrl} controls autoPlay muted loop className="rounded-lg shadow-lg w-full" />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity duration-300 flex items-center justify-center rounded-lg">
        <button
          onClick={handleDownload}
          className="bg-white text-gray-800 font-bold py-2 px-4 rounded-full flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform group-hover:scale-100 scale-90"
          aria-label={`Download video for ${recipeName}`}
        >
          <DownloadIcon className="w-5 h-5" />
          Preuzmi
        </button>
      </div>
    </div>
  );
};
