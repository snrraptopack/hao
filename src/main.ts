import { Component, ref, watch, type Ref } from './index'

// Benchmark configurations
const ROWS = 1000;
const WARMUP_RUNS = 3;
const BENCHMARK_RUNS = 5;

// Generate random data
function generateData(count: number) {
    const adjectives = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint'];
    const colors = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'orange', 'black', 'white'];
    const nouns = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger'];
    
    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        label: `${adjectives[Math.floor(Math.random() * 10)]} ${colors[Math.floor(Math.random() * 10)]} ${nouns[Math.floor(Math.random() * 10)]}`
    }));
}

// Utility: Measure execution time
function measureTime(fn: () => void): number {
    const start = performance.now();
    fn();
    return performance.now() - start;
}

function calculateStdDev(values: number[]): number {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const squareDiffs = values.map(value => Math.pow(value - avg, 2));
    const avgSquareDiff = squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
}

interface BenchmarkResult {
    framework: number;
    vanilla: number;
    ratio: number;
}

// Main Benchmark App
const BenchmarkApp = Component((ui) => {
    const currentTest = ref<string>('');
    const isRunning = ref(false);
    const results = ref<Record<string, BenchmarkResult>>({});
    const testData = ref<Array<{ id: number; label: string }>>([]);
    
    // Benchmark functions
    async function runBenchmark(testName: string) {
        isRunning.value = true;
        currentTest.value = testName;
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const frameworkTimes: number[] = [];
        const vanillaTimes: number[] = [];
        
        // Run framework benchmarks
        for (let i = 0; i < WARMUP_RUNS + BENCHMARK_RUNS; i++) {
            const time = measureTime(() => {
                switch(testName) {
                    case 'create':
                        testData.value = generateData(ROWS);
                        break;
                    case 'update':
                        testData.value = testData.value.map(item => ({
                            ...item,
                            label: item.label + ' !!!'
                        }));
                        break;
                    case 'partial':
                        testData.value = testData.value.map((item, idx) => 
                            idx % 10 === 0 ? { ...item, label: item.label + ' !!!' } : item
                        );
                        break;
                    case 'swap':
                        if (testData.value.length > 998) {
                            const d = [...testData.value];
                            const tmp = d[1];
                            d[1] = d[998];
                            d[998] = tmp;
                            testData.value = d;
                        }
                        break;
                    case 'clear':
                        testData.value = [];
                        break;
                }
            });
            
            if (i >= WARMUP_RUNS) {
                frameworkTimes.push(time);
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        // Run vanilla JS benchmarks for comparison
        for (let i = 0; i < WARMUP_RUNS + BENCHMARK_RUNS; i++) {
            let vanillaData = [...testData.value];
            const time = measureTime(() => {
                switch(testName) {
                    case 'create':
                        vanillaData = generateData(ROWS);
                        break;
                    case 'update':
                        vanillaData = vanillaData.map(item => ({
                            ...item,
                            label: item.label + ' !!!'
                        }));
                        break;
                    case 'partial':
                        vanillaData = vanillaData.map((item, idx) => 
                            idx % 10 === 0 ? { ...item, label: item.label + ' !!!' } : item
                        );
                        break;
                    case 'swap':
                        if (vanillaData.length > 998) {
                            const tmp = vanillaData[1];
                            vanillaData[1] = vanillaData[998];
                            vanillaData[998] = tmp;
                        }
                        break;
                    case 'clear':
                        vanillaData = [];
                        break;
                }
            });
            
            if (i >= WARMUP_RUNS) {
                vanillaTimes.push(time);
            }
            await new Promise(resolve => setTimeout(resolve, 10));
        }
        
        const avgFramework = frameworkTimes.reduce((a, b) => a + b, 0) / frameworkTimes.length;
        const avgVanilla = vanillaTimes.reduce((a, b) => a + b, 0) / vanillaTimes.length;
        const ratio = avgFramework / avgVanilla;
        
        results.value = {
            ...results.value,
            [testName]: {
                framework: avgFramework,
                vanilla: avgVanilla,
                ratio: ratio
            }
        };
        
        isRunning.value = false;
        currentTest.value = '';
    }
    
    async function runAllBenchmarks() {
        const tests = ['create', 'update', 'partial', 'swap', 'clear'];
        for (const test of tests) {
            await runBenchmark(test);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    const getTestTitle = (name: string): string => {
        const titles: Record<string, string> = {
            create: '🏗️ Create 1000 Rows',
            update: '🔄 Update All Rows',
            partial: '⚡ Partial Update (every 10th)',
            swap: '🔀 Swap Rows',
            clear: '🗑️ Clear All Rows'
        };
        return titles[name] || name;
    };
    
    ui.Div({ className: "max-w-6xl mx-auto bg-white rounded-xl shadow-2xl p-8" }, (ui) => {
        // Header
        ui.H1({ 
            text: "⚡ Framework Performance Benchmark", 
            className: "text-4xl font-bold text-gray-800 mb-2" 
        });
        ui.P({ 
            text: "Comparing your framework against Vanilla JS baseline", 
            className: "text-gray-600 mb-6" 
        });
        
        // Info Box
        ui.Div({ className: "bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6" }, (ui) => {
            ui.P({ className: "font-semibold text-blue-900 mb-2" }, (ui) => {
                ui.Text({ value: "📊 Benchmark Tests:" });
            });
            ui.Ul({ className: "text-sm text-blue-800 space-y-1 ml-4 list-disc" }, (ui) => {
                ui.Li({ text: "Create 1000 rows with reactive data" });
                ui.Li({ text: "Update all 1000 rows" });
                ui.Li({ text: "Partial update (every 10th row)" });
                ui.Li({ text: "Swap rows (test keyed diffing)" });
                ui.Li({ text: "Clear all rows (cleanup test)" });
            });
        });
        
        // Controls
        ui.Div({ className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8" }, (ui) => {
            ui.Button({
                text: "Run All Tests",
                className: "col-span-2 md:col-span-3 lg:col-span-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:from-purple-700 hover:to-blue-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
                disabled: isRunning,
                on: { click: () => runAllBenchmarks() }
            });
            
            ['create', 'update', 'partial', 'swap', 'clear'].forEach(test => {
                ui.Button({
                    text: getTestTitle(test),
                    className: "bg-white border-2 border-purple-600 text-purple-600 font-semibold py-2 px-4 rounded-lg hover:bg-purple-50 transition disabled:opacity-50 disabled:cursor-not-allowed",
                    disabled: isRunning,
                    on: { click: () => runBenchmark(test) }
                });
            });
        });
        
        // Running indicator
        ui.When(isRunning as Ref<boolean>, (ui) => {
            ui.Div({ className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 animate-pulse" }, (ui) => {
                ui.P({ 
                    text: watch(currentTest, (test) => `🔄 Running: ${getTestTitle(test)}...`) as any,
                    className: "text-yellow-800 font-semibold"
                });
            });
        });
        
        // Results
        ui.Div({ className: "space-y-4 mb-8" }, (ui) => {
            ['create', 'update', 'partial', 'swap', 'clear'].forEach(test => {
                const hasResult = watch(results, (r) => test in r) as Ref<boolean>;
                
                ui.When(hasResult, (ui) => {
                    ui.Div({ className: "bg-gray-50 border-l-4 border-purple-600 rounded-lg p-6" }, (ui) => {
                        ui.H3({ 
                            text: getTestTitle(test),
                            className: "text-xl font-bold text-gray-800 mb-3"
                        });
                        
                        ui.Div({ className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, (ui) => {
                            ui.Div({ className: "bg-white rounded-lg p-4 shadow" }, (ui) => {
                                ui.P({ text: "Your Framework", className: "text-sm text-gray-600 mb-1" });
                                ui.P({ 
                                    text: watch(results, (r) => r[test] ? `${r[test].framework.toFixed(2)}ms` : '-') as any,
                                    className: "text-2xl font-bold text-purple-600"
                                });
                            });
                            
                            ui.Div({ className: "bg-white rounded-lg p-4 shadow" }, (ui) => {
                                ui.P({ text: "Vanilla JS", className: "text-sm text-gray-600 mb-1" });
                                ui.P({ 
                                    text: watch(results, (r) => r[test] ? `${r[test].vanilla.toFixed(2)}ms` : '-') as any,
                                    className: "text-2xl font-bold text-blue-600"
                                });
                            });
                            
                            ui.Div({ className: "bg-white rounded-lg p-4 shadow" }, (ui) => {
                                ui.P({ text: "Performance Ratio", className: "text-sm text-gray-600 mb-1" });
                                ui.P({ 
                                    text: watch(results, (r) => {
                                        if (!r[test]) return '-';
                                        const ratio = r[test].ratio;
                                        const emoji = ratio < 1.5 ? '🏆' : ratio < 3 ? '✅' : ratio < 5 ? '👍' : '⚠️';
                                        return `${ratio.toFixed(2)}x ${emoji}`;
                                    }) as any,
                                    className: "text-2xl font-bold text-gray-800"
                                });
                            });
                        });
                        
                        ui.P({ 
                            text: watch(results, (r) => {
                                if (!r[test]) return '';
                                return `${BENCHMARK_RUNS} runs (${WARMUP_RUNS} warmup runs discarded)`;
                            }) as any,
                            className: "text-xs text-gray-500 mt-3"
                        });
                    });
                });
            });
        });
        
        // Comparison Summary
        ui.When(
            watch(results, (r) => Object.keys(r).length > 0) as Ref<boolean>,
            (ui) => {
                ui.Div({ className: "bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6" }, (ui) => {
                    ui.H2({ 
                        text: "📈 Performance Summary",
                        className: "text-2xl font-bold text-gray-800 mb-4"
                    });
                    
                    ui.P({ 
                        text: watch(results, (r) => {
                            const avgRatio = Object.values(r).reduce((sum, result) => sum + result.ratio, 0) / Object.values(r).length;
                            return `Average Performance: ${avgRatio.toFixed(2)}x slower than Vanilla JS`;
                        }) as any,
                        className: "text-lg text-gray-700 mb-2"
                    });
                    
                    ui.Div({ className: "bg-white rounded-lg p-4 mt-4" }, (ui) => {
                        ui.P({ text: "Performance Guide:", className: "font-semibold text-gray-800 mb-2" });
                        ui.Ul({ className: "text-sm text-gray-600 space-y-1 ml-4 list-disc" }, (ui) => {
                            ui.Li({ text: "1.0x - 2.0x: Excellent (React-level performance)" });
                            ui.Li({ text: "2.0x - 4.0x: Good (Vue/Svelte range)" });
                            ui.Li({ text: "4.0x - 8.0x: Acceptable for most apps" });
                            ui.Li({ text: ">10x: Optimization needed" });
                        });
                    });
                });
            }
        );
        
        // Test Data Display (hidden by default, for debugging)
        ui.Div({ className: "mt-8 border-t pt-6" }, (ui) => {
            ui.Div({ className: "bg-gray-50 rounded-lg p-4" }, (ui) => {
                ui.P({ className: "cursor-pointer font-semibold text-gray-700 hover:text-purple-600" }, (ui) => {
                    ui.Text({ value: "🔍 View Test Data" });
                });
                ui.Div({ className: "mt-4 max-h-64 overflow-auto" }, (ui) => {
                    ui.P({ 
                        text: watch(testData, (data) => `${data.length} rows`) as any,
                        className: "text-sm text-gray-600 mb-2"
                    });
                    ui.List({
                        items: testData,
                        key: (item) => item.id,
                        className: "space-y-1",
                        render: (item, index, ui) => {
                            ui.Div({ className: "text-xs text-gray-600 font-mono bg-white p-2 rounded" }, (ui) => {
                                ui.Text({ value: `${item.id}: ${item.label}` });
                            });
                        }
                    });
                });
            });
        });
    });
});

// Mount the app
const app = document.getElementById('app');
if (app) {
    app.appendChild(BenchmarkApp);
}
