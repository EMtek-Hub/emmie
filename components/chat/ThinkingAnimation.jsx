import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Search, 
  Zap, 
  MessageSquare, 
  Settings, 
  Sparkles,
  Code,
  Image as ImageIcon
} from 'lucide-react';

// Enhanced thinking animation component with multiple states
export function ThinkingAnimation({ 
  state = 'thinking', 
  toolName = null, 
  message = null,
  className = ''
}) {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const stateConfig = {
    thinking: {
      icon: Brain,
      message: message || 'Thinking',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    processing: {
      icon: Settings,
      message: message || 'Processing',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    },
    searching: {
      icon: Search,
      message: message || 'Searching documents',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    generating: {
      icon: Sparkles,
      message: message || 'Generating response',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    coding: {
      icon: Code,
      message: message || 'Running code',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200'
    },
    imaging: {
      icon: ImageIcon,
      message: message || 'Generating image',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-200'
    },
    tool: {
      icon: Zap,
      message: message || `Using ${toolName || 'tool'}`,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    }
  };

  const config = stateConfig[state] || stateConfig.thinking;
  const Icon = config.icon;

  return (
    <div className={`flex justify-start w-full ${className}`}>
      <div className="max-w-3xl w-full pr-16">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
            <img src="/emmie-icon-d.svg" alt="Emmie" className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className={`${config.bgColor} border ${config.borderColor} shadow-sm rounded-2xl px-4 py-3 animate-thinking-pulse`}>
              <div className="flex items-center gap-3">
                {/* Animated icon */}
                <div className={`${config.color} animate-thinking-bounce`}>
                  <Icon className="w-4 h-4" />
                </div>
                
                {/* Thinking dots */}
                <div className="flex space-x-1">
                  <div className={`w-2 h-2 ${config.color.replace('text-', 'bg-')} rounded-full animate-thinking-dot-1`}></div>
                  <div className={`w-2 h-2 ${config.color.replace('text-', 'bg-')} rounded-full animate-thinking-dot-2`}></div>
                  <div className={`w-2 h-2 ${config.color.replace('text-', 'bg-')} rounded-full animate-thinking-dot-3`}></div>
                </div>
                
                {/* Status message */}
                <span className={`text-sm font-medium ${config.color}`}>
                  {config.message}{dots}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced typing indicator for streaming responses
export function TypingIndicator({ className = '' }) {
  return (
    <div className={`flex justify-start w-full ${className}`}>
      <div className="max-w-3xl w-full pr-16">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
            <img src="/emmie-icon-d.svg" alt="Emmie" className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-1"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-2"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-typing-3"></div>
                </div>
                <span className="text-sm text-gray-600">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Emmie is typing...
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Progressive thinking indicator that cycles through states
export function ProgressiveThinkingIndicator({ 
  currentState = 'thinking',
  states = ['thinking', 'processing', 'generating'],
  className = ''
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  useEffect(() => {
    if (states.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % states.length);
    }, 2000);
    
    return () => clearInterval(interval);
  }, [states.length]);

  const activeState = states[currentIndex] || currentState;

  return (
    <ThinkingAnimation 
      state={activeState}
      className={className}
    />
  );
}

// Tool-specific thinking indicator
export function ToolThinkingIndicator({ 
  toolName, 
  toolType = 'function',
  phase = 'starting',
  className = ''
}) {
  const getStateFromTool = (name, type, phase) => {
    if (name === 'document_search' || name === 'search') return 'searching';
    if (name === 'image_generation' || type === 'image_generation') return 'imaging';
    if (name === 'code_interpreter' || type === 'code_interpreter') return 'coding';
    if (name === 'vision_analysis') return 'processing';
    return 'tool';
  };

  const getMessageFromPhase = (phase, toolName) => {
    switch (phase) {
      case 'starting': return `Starting ${toolName}...`;
      case 'running': return `Running ${toolName}...`;
      case 'completing': return `Finishing ${toolName}...`;
      default: return `Using ${toolName}...`;
    }
  };

  const state = getStateFromTool(toolName, toolType, phase);
  const message = getMessageFromPhase(phase, toolName);

  return (
    <ThinkingAnimation 
      state={state}
      toolName={toolName}
      message={message}
      className={className}
    />
  );
}

// Smart thinking indicator that adapts based on context
export function SmartThinkingIndicator({ 
  isStreaming = false,
  toolCall = null,
  userMessage = '',
  className = ''
}) {
  // Determine the best thinking state based on context
  const getSmartState = () => {
    if (toolCall) {
      return 'tool';
    }
    
    if (isStreaming) {
      return 'generating';
    }
    
    // Analyze user message for context
    const message = userMessage.toLowerCase();
    if (message.includes('image') || message.includes('picture') || message.includes('generate')) {
      return 'imaging';
    }
    if (message.includes('code') || message.includes('debug') || message.includes('script')) {
      return 'coding';
    }
    if (message.includes('search') || message.includes('find') || message.includes('document')) {
      return 'searching';
    }
    
    return 'thinking';
  };

  const state = getSmartState();
  const toolName = toolCall?.name || toolCall?.tool_name;

  if (toolCall) {
    return (
      <ToolThinkingIndicator 
        toolName={toolName}
        toolType={toolCall.type}
        className={className}
      />
    );
  }

  return (
    <ThinkingAnimation 
      state={state}
      className={className}
    />
  );
}
