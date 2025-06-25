import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Brain, Loader, Mic, MicOff, Volume2 } from 'lucide-react';

interface AskDeepMindModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

// Mock response generator for demonstration purposes
const generateMockResponse = async (query: string, history: Array<{type: 'user' | 'ai', content: string, timestamp: Date}>): Promise<string> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
  
  const responses = [
    `Based on your query about "${query}", I can provide insights from our neural network analysis. The patterns suggest interesting correlations in the data.`,
    `Analyzing "${query}" through our DeepMind algorithms reveals several key factors. Let me break down the findings for you.`,
    `Your question about "${query}" touches on complex neural patterns. Our AI models have identified relevant trends and can offer predictive insights.`,
    `Processing "${query}" through our enhanced learning systems shows promising results. The data indicates several actionable recommendations.`,
    `The query "${query}" has been analyzed using our advanced AI capabilities. Here are the key insights and potential solutions.`
  ];
  
  const contextualResponses = {
    'weather': 'Our climate prediction models show dynamic weather patterns. The neural networks have identified seasonal trends and can forecast conditions.',
    'population': 'Population analytics reveal interesting demographic shifts. Our AI models track migration patterns and urban development trends.',
    'economy': 'Economic indicators processed through our deep learning systems show market fluctuations and growth opportunities.',
    'technology': 'Technology trend analysis indicates rapid innovation cycles. Our AI identifies emerging patterns in tech adoption.',
    'health': 'Health data analysis through our neural networks reveals important wellness trends and predictive health indicators.'
  };
  
  // Add context awareness based on conversation history
  if (history.length > 0) {
    const lastMessage = history[history.length - 1];
    if (lastMessage.type === 'ai' && query.toLowerCase().includes('more') || query.toLowerCase().includes('tell me')) {
      return `Building on our previous discussion, here's additional insight about "${query}": Our advanced neural networks continue to process and refine the analysis based on your ongoing conversation.`;
    }
  }
  
  // Check for contextual keywords
  const lowerQuery = query.toLowerCase();
  for (const [keyword, response] of Object.entries(contextualResponses)) {
    if (lowerQuery.includes(keyword)) {
      return response;
    }
  }
  
  // Return random response if no context match
  return responses[Math.floor(Math.random() * responses.length)];
};

export default function AskDeepMindModal({ isOpen, onClose }: AskDeepMindModalProps) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{type: 'user' | 'ai', content: string, timestamp: Date}>>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition ?? (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = () => {
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Initialize speech synthesis
    speechSynthRef.current = window.speechSynthesis;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthRef.current) {
        speechSynthRef.current.cancel();
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userQuery = query.trim();
    setQuery('');
    setIsLoading(true);
      setResponse('');

      // Add user message to conversation
      const userMessage = { type: 'user' as const, content: userQuery, timestamp: new Date() };
      setConversationHistory(prev => [...prev, userMessage]);

      try {
        // Generate AI response using a simple mock implementation
        const aiResponse = await generateMockResponse(userQuery, conversationHistory);

        setResponse(aiResponse);
        
        // Add AI response to conversation
        const aiMessage = { type: 'ai' as const, content: aiResponse, timestamp: new Date() };
        setConversationHistory(prev => [...prev, aiMessage]);

        // Speak the response if speech synthesis is available
        if (speechSynthRef.current && aiResponse) {
          speakResponse(aiResponse);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        const errorMessage = 'I apologize, but I encountered an error processing your request. Please try again.';
        setResponse(errorMessage);
        
        const aiMessage = { type: 'ai' as const, content: errorMessage, timestamp: new Date() };
        setConversationHistory(prev => [...prev, aiMessage]);
      } finally {
        setIsLoading(false);
      }
  };

  const speakResponse = (text: string) => {
    if (!speechSynthRef.current) return;
    
    setIsSpeaking(true);
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 0.8;
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    speechSynthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopSpeaking = () => {
    if (speechSynthRef.current) {
      speechSynthRef.current.cancel();
      setIsSpeaking(false);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResponse('');
    setQuery('');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-surface-deep rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-surface-light">
            <div className="flex items-center gap-3">
              <Brain className="text-accent-neural" size={24} />
              <h2 className="text-2xl font-bold text-white">Ask DeepMind</h2>
            </div>
            <div className="flex items-center gap-2">
              {conversationHistory.length > 0 && (
                <button
                  onClick={clearConversation}
                  className="text-gray-400 hover:text-white transition-colors px-3 py-1 rounded-lg hover:bg-surface-light"
                >
                  Clear
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-surface-light"
                aria-label="Close DeepMind Modal"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Conversation History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 max-h-[50vh]">
            {conversationHistory.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <Brain className="mx-auto mb-4 text-accent-neural" size={48} />
                <p className="text-lg mb-2">Welcome to DeepMind AI Assistant</p>
                <p className="text-sm">Ask me anything about Earth data, analytics, or global insights!</p>
              </div>
            ) : (
              conversationHistory.map((message, index) => (
                <div
                  key={`message-${index}-${message.timestamp.getTime()}`}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-4 rounded-2xl ${
                      message.type === 'user'
                        ? 'bg-accent-neural text-white'
                        : 'bg-surface-light text-gray-100'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            
            {/* Current Response */}
            {(isLoading || response) && (
              <div className="flex justify-start">
                <div className="max-w-[80%] p-4 rounded-2xl bg-surface-light text-gray-100">
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <Loader className="animate-spin" size={16} />
                      <span>DeepMind is thinking...</span>
                    </div>
                  ) : (
                    <div>
                      <p className="whitespace-pre-wrap">{response}</p>
                      {isSpeaking && (
                        <button
                          onClick={stopSpeaking}
                          className="mt-2 flex items-center gap-1 text-accent-neural hover:text-accent-pulse transition-colors"
                        >
                          <Volume2 size={14} />
                          <span className="text-xs">Speaking... (click to stop)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <div className="p-6 border-t border-surface-light">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask DeepMind anything about Earth data, analytics, or global insights..."
                  className="w-full bg-surface-light text-white rounded-xl px-4 py-3 pr-12 resize-none focus:outline-none focus:ring-2 focus:ring-accent-neural"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                {recognitionRef.current && (
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`absolute right-3 top-3 p-2 rounded-lg transition-colors ${
                      isListening
                        ? 'bg-red-500 text-white'
                        : 'text-gray-400 hover:text-white hover:bg-surface-deep'
                    }`}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={!query.trim() || isLoading}
                className="neural-button px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={isLoading ? "Sending query, please wait" : "Send query to DeepMind"}
              >
                {isLoading ? <Loader className="animate-spin" size={20} /> : <Send size={20} />}
              </button>
            </form>
            <p className="text-xs text-gray-400 mt-2">
              Press Enter to send, Shift+Enter for new line
              {recognitionRef.current && ' • Click mic for voice input'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
