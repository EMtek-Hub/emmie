// Test cases for the enhanced image detection (self-contained version)
const testCases = [
  // Basic image generation requests (should work without context)
  {
    message: "generate an image of a blue sky",
    recentMessages: [],
    expected: true,
    description: "Basic image generation request"
  },
  {
    message: "create a picture of a sunset",
    recentMessages: [],
    expected: true,
    description: "Basic image creation request"
  },
  {
    message: "draw a cat",
    recentMessages: [],
    expected: true,
    description: "Simple draw request"
  },

  // Contextual modification requests (should work WITH context)
  {
    message: "make the clouds green",
    recentMessages: [
      { role: "user", content: "generate an image of a blue sky" },
      { role: "assistant", content: "I've generated an image based on your request: \"generate an image of a blue sky\"\n\n![Generated Image](https://example.com/image.png)", messageType: "image" }
    ],
    expected: true,
    description: "Color modification after image generation"
  },
  {
    message: "make it bigger",
    recentMessages: [
      { role: "user", content: "create a picture of a house" },
      { role: "assistant", content: "![Generated Image](https://example.com/house.png)", messageType: "image" }
    ],
    expected: true,
    description: "Size modification after image generation"
  },
  {
    message: "change the sky to purple",
    recentMessages: [
      { role: "user", content: "draw a landscape" },
      { role: "assistant", content: "I've generated an image for you:\n\n![Landscape](https://example.com/landscape.png)" }
    ],
    expected: true,
    description: "Object modification with color change"
  },
  {
    message: "add some birds",
    recentMessages: [
      { role: "user", content: "make an image of a tree" },
      { role: "assistant", content: "![Tree Image](https://example.com/tree.png)", messageType: "image" }
    ],
    expected: true,
    description: "Adding elements to existing image"
  },
  {
    message: "turn it into a cartoon style",
    recentMessages: [
      { role: "user", content: "generate a photo of a dog" },
      { role: "assistant", content: "Here's your generated image:\n\n![Dog Photo](https://example.com/dog.png)" }
    ],
    expected: true,
    description: "Style modification request"
  },

  // Non-image requests (should NOT trigger, even with context)
  {
    message: "what's the weather like?",
    recentMessages: [
      { role: "user", content: "generate an image of clouds" },
      { role: "assistant", content: "![Clouds](https://example.com/clouds.png)", messageType: "image" }
    ],
    expected: false,
    description: "Unrelated question after image generation"
  },
  {
    message: "thank you",
    recentMessages: [
      { role: "user", content: "create a logo" },
      { role: "assistant", content: "![Logo](https://example.com/logo.png)", messageType: "image" }
    ],
    expected: false,
    description: "Gratitude expression after image generation"
  },
  {
    message: "how does this work?",
    recentMessages: [],
    expected: false,
    description: "General question without context"
  },

  // Edge cases
  {
    message: "make the clouds green",
    recentMessages: [
      { role: "user", content: "what's the weather forecast?" },
      { role: "assistant", content: "Today will be sunny with some clouds." }
    ],
    expected: false,
    description: "Modification request without recent image context"
  },
  {
    message: "can you make it more colorful?",
    recentMessages: [
      { role: "user", content: "generate a rainbow" },
      { role: "assistant", content: "![Rainbow](https://example.com/rainbow.png)", messageType: "image" },
      { role: "user", content: "what time is it?" },
      { role: "assistant", content: "It's currently 3:30 PM" },
      { role: "user", content: "tell me a joke" },
      { role: "assistant", content: "Why did the chicken cross the road?" }
    ],
    expected: true,
    description: "Modification request with older image context (within last 5 messages)"
  }
];

console.log('🧪 Testing Enhanced Image Detection Logic');
console.log('==========================================\n');

// Since we can't import TypeScript directly, we'll need to test this differently
// Let's create a JavaScript version of the detection function for testing

function detectImageGenerationRequestJS(message, recentMessages = []) {
  const lowerMessage = message.toLowerCase().trim();
  
  // Check if there was a recent image generation in the conversation
  const hasRecentImageGeneration = recentMessages.some((msg, index) => {
    // Look at the last 5 messages for context
    if (index >= recentMessages.length - 5) {
      return msg.role === 'assistant' && 
             (msg.messageType === 'image' || 
              msg.content.includes('![') || 
              msg.content.includes('I\'ve generated an image') ||
              msg.content.includes('generated an image'));
    }
    return false;
  });

  // Primary image generation triggers
  const primaryTriggers = [
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
  
  // Image modification triggers (require recent image context)
  const modificationTriggers = [
    'make the',
    'change the',
    'turn the',
    'make it',
    'change it',
    'turn it',
    'make them',
    'change them',
    'turn them',
    'add',
    'remove',
    'delete',
    'replace',
    'modify',
    'alter',
    'adjust',
    'edit',
    'update',
    'improve',
    'enhance',
    'fix',
    'correct'
  ];

  // Color-related modification patterns
  const colorModifications = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown',
    'black', 'white', 'gray', 'grey', 'silver', 'gold', 'cyan', 'magenta',
    'darker', 'lighter', 'brighter', 'dimmer', 'colorful', 'vibrant',
    'pastel', 'neon', 'bright', 'dark', 'light'
  ];

  // Size and style modifications
  const styleModifications = [
    'bigger', 'smaller', 'larger', 'wider', 'narrower', 'taller', 'shorter',
    'thicker', 'thinner', 'bolder', 'softer', 'smoother', 'rougher',
    'more detailed', 'less detailed', 'simpler', 'more complex',
    'realistic', 'abstract', 'cartoon', 'sketch'
  ];

  // Check for primary triggers first
  const hasPrimaryTrigger = primaryTriggers.some(trigger => lowerMessage.includes(trigger));
  
  // Check for format-specific requests that imply image generation
  const formatRequests = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'image file'];
  const hasFormatRequest = formatRequests.some(format => 
    lowerMessage.includes(`make ${format}`) || 
    lowerMessage.includes(`create ${format}`) ||
    lowerMessage.includes(`generate ${format}`) ||
    lowerMessage.includes(`make a ${format}`) ||
    lowerMessage.includes(`create a ${format}`) ||
    lowerMessage.includes(`generate a ${format}`)
  );

  // Check for modification triggers (only if there was a recent image)
  let hasModificationTrigger = false;
  if (hasRecentImageGeneration) {
    const hasModTrigger = modificationTriggers.some(trigger => lowerMessage.includes(trigger));
    const hasColorMod = colorModifications.some(color => lowerMessage.includes(color));
    const hasStyleMod = styleModifications.some(style => lowerMessage.includes(style));
    
    // Additional contextual patterns for image modification
    const contextualPatterns = [
      /make (it|them|the \w+) (more|less|\w+er|\w+)/,
      /change (it|them|the \w+) to/,
      /turn (it|them|the \w+) (into|\w+)/,
      /(add|remove|delete) (a|an|the|\w+)/,
      /make (a|an|the|\w+) (red|blue|green|yellow|orange|purple|pink|brown|black|white|gray|grey|silver|gold|cyan|magenta|darker|lighter|brighter|dimmer|bigger|smaller|larger)/,
      /can you (make|change|turn|add|remove|edit|modify|alter|adjust|update|fix)/
    ];
    
    const hasContextualPattern = contextualPatterns.some(pattern => pattern.test(lowerMessage));
    
    hasModificationTrigger = (hasModTrigger && (hasColorMod || hasStyleMod)) || hasContextualPattern;
  }

  // Additional checks for implicit image requests
  const implicitImageRequests = [
    /show (me )?a (picture|image|photo|graphic) of/,
    /what (would|does) (a|an|\w+) look like/,
    /how (would|does) (it|this|that) look/,
    /visualize/,
    /visual representation/
  ];
  
  const hasImplicitRequest = implicitImageRequests.some(pattern => pattern.test(lowerMessage));

  return hasPrimaryTrigger || hasFormatRequest || hasModificationTrigger || hasImplicitRequest;
}

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  const result = detectImageGenerationRequestJS(testCase.message, testCase.recentMessages);
  const success = result === testCase.expected;
  
  if (success) {
    passed++;
    console.log(`✅ Test ${index + 1}: ${testCase.description}`);
  } else {
    failed++;
    console.log(`❌ Test ${index + 1}: ${testCase.description}`);
    console.log(`   Message: "${testCase.message}"`);
    console.log(`   Expected: ${testCase.expected}, Got: ${result}`);
    console.log(`   Context: ${testCase.recentMessages.length} recent messages`);
  }
});

console.log('\n==========================================');
console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('🎉 All tests passed! The enhanced image detection is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Review the logic and update as needed.');
}

// Additional manual tests you can run
console.log('\n🔍 Manual Test Examples:');
console.log('Try these messages after generating an image:');
console.log('- "make the clouds green"');
console.log('- "change it to red"');
console.log('- "make it bigger"');
console.log('- "add some trees"');
console.log('- "turn it into a cartoon"');
