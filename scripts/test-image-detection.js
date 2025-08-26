// scripts/test-image-detection.js
// Test script to verify image generation detection

const { detectImageGenerationRequest } = require('../lib/ai.ts');

const testPhrases = [
  // Should trigger (true)
  { phrase: "make an image of blue sky", expected: true },
  { phrase: "make a png", expected: true },
  { phrase: "create a jpg of a sunset", expected: true },
  { phrase: "generate an image", expected: true },
  { phrase: "can you make an image", expected: true },
  { phrase: "please create a picture", expected: true },
  { phrase: "draw a diagram", expected: true },
  { phrase: "make me a photo of a cat", expected: true },
  { phrase: "I need an image of a house", expected: true },
  { phrase: "show me a picture of the ocean", expected: true },
  { phrase: "make image", expected: true },
  { phrase: "design a graphic", expected: true },
  { phrase: "render an image of a car", expected: true },
  
  // Should NOT trigger (false)
  { phrase: "tell me about images", expected: false },
  { phrase: "what is a png file", expected: false },
  { phrase: "explain how to draw", expected: false },
  { phrase: "the picture looks nice", expected: false },
  { phrase: "I saw an image yesterday", expected: false }
];

console.log('🧪 Testing Image Generation Detection\n');
console.log('=====================================\n');

let passed = 0;
let failed = 0;

testPhrases.forEach(test => {
  const result = detectImageGenerationRequest(test.phrase);
  const status = result === test.expected ? '✅' : '❌';
  
  if (result === test.expected) {
    passed++;
  } else {
    failed++;
  }
  
  console.log(`${status} "${test.phrase}"`);
  console.log(`   Expected: ${test.expected}, Got: ${result}`);
  if (result !== test.expected) {
    console.log('   ⚠️  MISMATCH!');
  }
  console.log('');
});

console.log('=====================================');
console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);

if (failed === 0) {
  console.log('✨ All tests passed!');
} else {
  console.log('⚠️  Some tests failed. Check the detection logic.');
}
