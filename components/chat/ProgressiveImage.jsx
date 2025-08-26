import React, { useState, useEffect, useRef } from 'react';

const ProgressiveImage = ({ 
  streamingUrl, 
  prompt,
  onComplete,
  onError,
  className = "",
  showProgress = true 
}) => {
  const [currentImage, setCurrentImage] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('connecting'); // connecting, generating, completed, error
  const [error, setError] = useState(null);
  const [finalResult, setFinalResult] = useState(null);
  const eventSourceRef = useRef(null);
  const partialCount = useRef(0);

  useEffect(() => {
    if (!streamingUrl) return;

    console.log('🌊 Starting progressive image streaming...');
    setStatus('connecting');
    setError(null);
    partialCount.current = 0;

    // Create EventSource for Server-Sent Events
    const eventSource = new EventSource(streamingUrl);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('📡 Progressive streaming connection opened');
      setStatus('generating');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📡 Received streaming event:', data.type);

        switch (data.type) {
          case 'partial_image':
            partialCount.current += 1;
            setProgress(Math.min(partialCount.current * 20, 90)); // Estimate progress
            
            if (data.b64_json) {
              const imageUrl = `data:image/${data.output_format || 'png'};base64,${data.b64_json}`;
              setCurrentImage({
                url: imageUrl,
                isPartial: true,
                index: data.partial_image_index,
                size: data.size,
                quality: data.quality
              });
            }
            break;

          case 'completed':
            setProgress(100);
            setStatus('completed');
            
            if (data.b64_json) {
              const imageUrl = `data:image/${data.output_format || 'png'};base64,${data.b64_json}`;
              setCurrentImage({
                url: imageUrl,
                isPartial: false,
                size: data.size,
                quality: data.quality,
                usage: data.usage
              });
            }
            break;

          case 'saved':
            // Final result with storage URL
            setFinalResult({
              url: data.url,
              alt: data.alt,
              size: data.size,
              quality: data.quality,
              format: data.format,
              fileSize: data.fileSize,
              usage: data.usage
            });
            
            if (onComplete) {
              onComplete(data);
            }
            break;

          case 'error':
            console.error('❌ Progressive streaming error:', data.error);
            setError(data.error);
            setStatus('error');
            
            if (onError) {
              onError(data.error);
            }
            break;

          case 'done':
            // Clean up connection
            eventSource.close();
            break;

          default:
            console.log('📡 Unknown event type:', data.type);
            break;
        }
      } catch (parseError) {
        console.error('❌ Error parsing streaming data:', parseError);
        setError('Failed to parse streaming data');
        setStatus('error');
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ EventSource error:', error);
      setError('Streaming connection failed');
      setStatus('error');
      eventSource.close();
      
      if (onError) {
        onError('Streaming connection failed');
      }
    };

    // Cleanup function
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [streamingUrl, onComplete, onError]);

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to image generation service...';
      case 'generating':
        return partialCount.current > 0 
          ? `Generating image... (${partialCount.current} updates received)`
          : 'Starting image generation...';
      case 'completed':
        return 'Image generation completed!';
      case 'error':
        return `Error: ${error}`;
      default:
        return 'Preparing...';
    }
  };

  const getProgressBarColor = () => {
    switch (status) {
      case 'generating':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className={`progressive-image-container ${className}`}>
      {/* Status and Progress */}
      {showProgress && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              {getStatusMessage()}
            </span>
            {status === 'generating' && (
              <span className="text-sm text-gray-500">
                {progress}%
              </span>
            )}
          </div>
          
          {status !== 'error' && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor()}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Image Display */}
      <div className="relative">
        {currentImage && (
          <div className="relative">
            <img
              src={currentImage.url}
              alt={prompt || 'Generated image'}
              className={`max-w-full h-auto rounded-lg shadow-lg transition-opacity duration-300 ${
                currentImage.isPartial ? 'opacity-80' : 'opacity-100'
              }`}
              style={{
                filter: currentImage.isPartial ? 'blur(0.5px)' : 'none'
              }}
            />
            
            {/* Partial image indicator */}
            {currentImage.isPartial && (
              <div className="absolute top-2 left-2 bg-blue-500 text-white px-2 py-1 rounded text-xs">
                Preview #{currentImage.index + 1}
              </div>
            )}

            {/* Completion indicator */}
            {!currentImage.isPartial && status === 'completed' && (
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs">
                ✓ Complete
              </div>
            )}
          </div>
        )}

        {/* Error state */}
        {status === 'error' && !currentImage && (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="text-red-500 text-lg mb-2">⚠️</div>
              <div className="text-gray-600">{error}</div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {status === 'connecting' && !currentImage && (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-spin text-2xl mb-2">🎨</div>
              <div className="text-gray-600">Preparing to generate...</div>
            </div>
          </div>
        )}

        {/* Generating state without image yet */}
        {status === 'generating' && !currentImage && (
          <div className="flex items-center justify-center h-48 bg-gray-100 rounded-lg">
            <div className="text-center">
              <div className="animate-pulse text-2xl mb-2">✨</div>
              <div className="text-gray-600">Generating your image...</div>
            </div>
          </div>
        )}
      </div>

      {/* Final result metadata */}
      {finalResult && status === 'completed' && (
        <div className="mt-3 text-xs text-gray-500 space-y-1">
          <div>Size: {finalResult.size}</div>
          <div>Quality: {finalResult.quality}</div>
          <div>Format: {finalResult.format}</div>
          {finalResult.fileSize && (
            <div>File size: {(finalResult.fileSize / 1024).toFixed(1)} KB</div>
          )}
          {finalResult.usage && (
            <div>Tokens used: {finalResult.usage.total_tokens}</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;
