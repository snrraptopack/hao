import { compileTSX } from './dist/tsx-only-compiler.js';

const testTSX = `
import { ref } from "auwla"

const hello = ref(10)

export default function AboutPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">About Page</h1>
            <p>Hello world: {hello.value}</p>
        </div>
    )
}
`;

try {
  console.log('Testing TSX compilation...');
  const result = compileTSX(testTSX);
  console.log('✅ Success!');
  console.log(result);
} catch (error) {
  console.log('❌ Error:', error.message);
  console.log('Stack:', error.stack);
}