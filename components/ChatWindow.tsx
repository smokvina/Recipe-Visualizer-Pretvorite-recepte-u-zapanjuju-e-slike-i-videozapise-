import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { Message } from '../types';
import { createChatSession, generateImage, generateVideo } from '../services/geminiService';
import type { Chat } from '@google/genai';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ImageResult } from './ImageResult';
import { VideoResult } from './VideoResult';
import { KeyIcon } from './Icons';

type AspectRatio = '16:9' | '9:16';

export const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isKeyNeeded, setIsKeyNeeded] = useState<boolean>(false);
  const [pendingVideoAction, setPendingVideoAction] = useState<{ recipeName: string, videoPrompt: string, imageBase64: string, aspectRatio: AspectRatio } | null>(null);

  const chatSessionRef = useRef<Chat | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const addMessage = useCallback((role: 'user' | 'model', content: React.ReactNode) => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + Math.random(), role, content }]);
  }, []);
  
  const initChat = useCallback(async () => {
    setIsLoading(true);
    try {
      const chat = createChatSession();
      chatSessionRef.current = chat;
      
      const initialResponse = await chat.sendMessage({ message: "Start conversation" });
      addMessage('model', initialResponse.text);
    } catch (error) {
        console.error("Failed to initialize chat:", error);
        addMessage('model', 'Došlo je do pogreške prilikom pokretanja. Molimo osvježite stranicu.');
    } finally {
      setIsLoading(false);
    }
  }, [addMessage]);

  useEffect(() => {
    initChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const executePendingVideoAction = useCallback(async () => {
    if (!pendingVideoAction) return;

    const { recipeName, videoPrompt, imageBase64, aspectRatio } = pendingVideoAction;
    setPendingVideoAction(null);
    setIsLoading(true);

    addMessage('model', 'Pokušavam ponovno generirati video s odabranim ključem...');

    try {
        const videoUrl = await generateVideo(videoPrompt, imageBase64, aspectRatio);
        addMessage('model', <VideoResult videoUrl={videoUrl} recipeName={recipeName} />);
        addMessage('model', 'Uspješno! Nadam se da ti se sviđa!');
    } catch (error: any) {
        console.error("Error retrying video generation:", error);
        addMessage('model', 'Nažalost, i dalje postoji problem s generiranjem videa. Provjerite svoj API ključ i pokušajte ponovno.');
        if (error.message === 'API_KEY_REQUIRED' || error.message === 'API_KEY_NOT_FOUND') {
            setIsKeyNeeded(true);
            setPendingVideoAction({ recipeName, videoPrompt, imageBase64, aspectRatio });
        }
    } finally {
        setIsLoading(false);
    }
  }, [pendingVideoAction, addMessage]);

  const handleSelectKey = useCallback(async () => {
      await window.aistudio.openSelectKey();
      setIsKeyNeeded(false);
      executePendingVideoAction();
  }, [executePendingVideoAction]);

  const handleSendMessage = async (text: string) => {
    if (isLoading || !text.trim() || !chatSessionRef.current) return;

    addMessage('user', text);
    setIsLoading(true);

    try {
      const response = await chatSessionRef.current.sendMessage({ message: text });
      const responseText = response.text.trim();

      if (responseText.startsWith('{') && responseText.endsWith('}')) {
        try {
          const parsed = JSON.parse(responseText);

          const handleImageGeneration = async (recipeName: string, ingredients: string[]) => {
            addMessage('model', `Odlično! Prvo generiram sliku za "${recipeName}"...`);
            const imageUrl = await generateImage(recipeName, ingredients);
            const imageBase64 = imageUrl.split(',')[1];
            addMessage('model', <ImageResult imageUrl={imageUrl} recipeName={recipeName} />);
            return { imageUrl, imageBase64 };
          };
        
          const handleVideoGeneration = async (recipeName: string, videoPrompt: string, imageBase64: string, aspectRatio: AspectRatio) => {
            addMessage('model', 'Sada generiram video... Ovo može potrajati nekoliko minuta. Uživajte u šalici kave dok čekate! ☕');
            try {
                const videoUrl = await generateVideo(videoPrompt, imageBase64, aspectRatio);
                addMessage('model', <VideoResult videoUrl={videoUrl} recipeName={recipeName} />);
                addMessage('model', 'Evo i videa! Nadam se da ti se sviđa! Želiš li napraviti još nešto?');
            } catch (error: any) {
                if (error.message === 'API_KEY_REQUIRED') {
                    addMessage('model', 'Za generiranje videa potrebno je odabrati API ključ.');
                    setIsKeyNeeded(true);
                    setPendingVideoAction({ recipeName, videoPrompt, imageBase64, aspectRatio });
                } else if (error.message === 'API_KEY_NOT_FOUND') {
                    addMessage('model', 'Vaš API ključ nije pronađen ili nije ispravan. Molimo odaberite ga ponovno.');
                     setIsKeyNeeded(true);
                    setPendingVideoAction({ recipeName, videoPrompt, imageBase64, aspectRatio });
                }
                else {
                    console.error("Error generating video:", error);
                    addMessage('model', 'Žao mi je, došlo je do pogreške prilikom generiranja videa.');
                }
            }
          };

          if (parsed.action === 'generate_image' && parsed.recipeName && parsed.ingredients) {
            await handleImageGeneration(parsed.recipeName, parsed.ingredients);
            addMessage('model', 'Nadam se da ti se sviđa! Želiš li napraviti još nešto?');
          } else if ((parsed.action === 'generate_video' || parsed.action === 'generate_both') && parsed.recipeName && parsed.ingredients && parsed.videoPrompt && parsed.aspectRatio) {
            const aspectRatio = parsed.aspectRatio === '16:9' || parsed.aspectRatio === '9:16' ? parsed.aspectRatio : '16:9';
            const { imageBase64 } = await handleImageGeneration(parsed.recipeName, parsed.ingredients);
            await handleVideoGeneration(parsed.recipeName, parsed.videoPrompt, imageBase64, aspectRatio);
          } else {
            addMessage('model', responseText);
          }
          return;
        } catch (e) {
          // Not our JSON, fall through
        }
      }
      
      addMessage('model', responseText);
    } catch (error) {
      console.error("Error sending message:", error);
      addMessage('model', 'Žao mi je, došlo je do pogreške. Možete li pokušati ponovno?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[80vh] bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
      <div ref={chatContainerRef} className="flex-grow p-6 overflow-y-auto space-y-6">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && messages.length > 0 && messages[messages.length-1].role === 'user' && <ChatMessage message={{id: 'loading', role: 'model', content: ''}} isLoading={true} />}
         {isKeyNeeded && (
            <div className="flex flex-col items-center justify-center p-4 gap-4 text-center">
                <div className="bg-yellow-900/50 border border-yellow-700 text-yellow-200 p-4 rounded-lg max-w-md">
                    <p className="font-bold">Potrebna je akcija</p>
                    <p className="text-sm mt-1">Za generiranje videa pomoću Veo modela potreban je API ključ s omogućenom naplatom.</p>
                    <p className="text-sm mt-2">Saznajte više o <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline hover:text-yellow-100">postavkama naplate</a>.</p>
                </div>
                <button
                    onClick={handleSelectKey}
                    className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full flex items-center gap-2 hover:bg-blue-700 transition-colors"
                >
                    <KeyIcon className="w-5 h-5" />
                    Odaberi API ključ
                </button>
            </div>
        )}
      </div>
      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading || isKeyNeeded} />
    </div>
  );
};