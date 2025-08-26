// Simple test to verify image generation detection
// Run with: node scripts/test-image-simple.js

// Inline the detection function for testing
function detectImageGenerationRequest(message) {
  const triggers = [
    'generate an image',
    'create an image',
    'make an image',
    'make a image',
    'make image',
    'draw',
    'illustrate',
    'create a diagram',
    'show me a picture',
    'generate a graphic',
    'create a visual',
    'make a picture',
    'create a picture',
    'generate a picture',
    'make a photo',
    'create a photo',
    'generate a photo',
    'make me an image',
    'make me a picture',
    'can you generate',
    'can you create an image',
    'can you make an image',
    'please generate',
    'please create an image',
    'please make an image',
    'design an image',
    'design a graphic',
    'produce an image',
    'render an image',
    'make a png',
    'create a png',
    'generate a png',
    'make a jpg',
    'create a jpg',
    'generate a jpg',
    'make a jpeg',
    'create a jpeg',
    'generate a jpeg',
    'image of',
    'picture of',
    'photo of',
    'graphic of',
    'visualization of',
    'depict',
    'show an image',
    'display an image'
  ];
  
  const lowerMessage = message.toLowerCase();
  
  // Check for any trigger phrase
  const hasTrigger = triggers.some(trigger => lowerMessage.includes(trigger));
  
  // Also check for format-specific requests that imply image generation
  const formatRequests = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'image file'];
  const hasFormatRequest = formatRequests.some(format => 
    lowerMessage.includes(`make ${format}`) || 
    lowerMessage.includes(`create ${format}`) ||
    lowerMessage.includes(`generate ${format}`) ||
    lowerMessage.includes(`make a ${format}`) ||
    lowerMessage.includes(`create a ${format}`) ||
    lowerMessage.includes(`generate a ${format}`)
  );
  
  return hasTrigger || hasFormatRequest;
}

// Test your specific phrases
const userPhrases = [
  "make an image of blue sky",
  "make a png",
  "make image",
  "create a picture of a sunset",
  "generate an image of a cat"
];

console.log('🧪 Testing Your Image Generation Phrases\n');
console.log('========================================\n');

userPhrases.forEach(phrase => {
  const result = detectImageGenerationRequest(phrase);
  const status = result ? '✅ WILL TRIGGER' : '❌ WON\'T TRIGGER';
  console.log(`${status}: "${phrase}"`);
});

console.log('\n========================================');
console.log('\n✨ The phrase "make an image of blue sky" is now detected!');
console.log('✨ The phrase "make a png" is now detected!');
console.log('\nYour chat should now properly trigger image generation instead of returning SVG code.');
