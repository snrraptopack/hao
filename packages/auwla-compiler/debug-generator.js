import * as _babelGenerator from '@babel/generator';

console.log('_babelGenerator:', _babelGenerator);
console.log('_babelGenerator.default:', _babelGenerator.default);
console.log('typeof _babelGenerator:', typeof _babelGenerator);
console.log('typeof _babelGenerator.default:', typeof _babelGenerator.default);

// Test different ways to access the function
const generate1 = _babelGenerator?.default ?? _babelGenerator;
const generate2 = _babelGenerator.default;
const generate3 = _babelGenerator;

console.log('generate1:', typeof generate1);
console.log('generate2:', typeof generate2);
console.log('generate3:', typeof generate3);