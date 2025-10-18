import { Component } from "./dsl"
import { ref, watch, type Ref } from "./state"
import { fetch as fetchData } from "./fetch"
import { Router, setRouter, Link, useParams, useQuery, useRouter } from "./index"


type Comment = {
    id: number
    name: string
    email: string
    body: string
}

type Product = {
    id: number
    title: string
    price: number
    description: string
    category: string
}

// ==================== Router Setup ====================

const app = document.getElementById("app")!

const router = new Router(app)
setRouter(router) // ✅ Set router BEFORE defining pages that use Link

// ==================== Pages ====================

// Home Page
const HomePage = () => {
    return Component((ui) => {
        ui.Div({ className: "min-h-screen bg-gradient-to-br from-indigo-50 to-cyan-50 flex items-center justify-center" }, (ui) => {
        ui.Div({ className: "text-center" }, (ui) => {
            ui.Text({ 
                value: "🏠 Welcome Home", 
                className: "text-6xl font-bold mb-6 text-gray-900" 
            })
            ui.Text({
                value: "A simple SPA router demo",
                className: "text-xl text-gray-600 mb-12"
            })
    
            ui.Div({ className: "flex gap-4 justify-center" }, (ui) => {
                ui.append(Link({ 
                    to: '/comments', 
                    text: 'View Comments',
                    className: 'px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg'
                }))
                
                ui.append(Link({ 
                    to: '/products', 
                    text: 'Browse Products',
                    className: 'px-8 py-4 bg-cyan-600 text-white rounded-xl font-bold hover:bg-cyan-700 transition-colors shadow-lg'
                }))
            })
        })
    })
    })
}

// Comments Page
const CommentsPage = () => {
    return Component((ui) => {
        const { data, loading, error } = fetchData<Comment[]>(
            'https://jsonplaceholder.typicode.com/comments?postId=1',
            { cacheKey: 'comments' }  // ✅ Cache with key "comments"
        )
        ui.Div({ className: "min-h-screen bg-gray-50" }, (ui) => {
        // Navigation
        ui.Div({ className: "bg-white shadow-sm border-b sticky top-0 z-10" }, (ui) => {
            ui.Div({ className: "max-w-4xl mx-auto px-6 py-4 flex items-center gap-4" }, (ui) => {
                ui.append(Link({ 
                    to: '/', 
                    text: '← Home',
                    className: 'text-indigo-600 hover:text-indigo-700 font-semibold'
                }))
                ui.Text({ 
                    value: "Comments", 
                    className: "text-2xl font-bold text-gray-900 ml-auto" 
                })
            })
        })
        
        ui.Div({ className: "max-w-4xl mx-auto p-8" }, (ui) => {
            // Loading state
            ui.When(loading, (ui) => {
                ui.Text({ 
                    value: "Loading comments...", 
                    className: "text-xl text-gray-500 animate-pulse" 
                })
            })
            
            // Error state
            ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
                ui.Div({ className: "bg-red-50 border border-red-200 rounded-lg p-4" }, (ui) => {
                    ui.Text({ 
                        value: "❌ Error loading comments",
                        className: "text-red-700 font-semibold mb-2" 
                    })
                    ui.Text({
                        value: error,
                        formatter: (e) => e || '',
                        className: "text-red-600 text-sm"
                    })
                })
            })
            
            // Data state
            ui.When(watch(data, d => d !== null && d.length > 0) as Ref<boolean>, (ui) => {
                ui.List({
                    items: data as Ref<Comment[]>,
                    className: "space-y-4",
                    key: (comment) => comment.id,
                    render: (comment, index, ui) => {
                        ui.Div({ 
                            className: "bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow" 
                        }, (ui) => {
                            ui.Text({ 
                                value: comment.name, 
                                className: "text-lg font-bold text-gray-800 mb-2" 
                            })
                            ui.Text({ 
                                value: comment.body,
                                className: "text-gray-600 mb-3 leading-relaxed"
                            })
                            ui.Text({
                                value: comment.email,
                                className: "text-sm text-indigo-600 font-medium"
                            })
                        })
                    }
                })
            })
        })
    })
    })
}

// Products List Page
const ProductsPage = () => {
    return Component((ui) => {
        const { data, loading, error } = fetchData<{ products: Product[] }>(
            'https://dummyjson.com/products?limit=10',
            { cacheKey: 'products' }  // ✅ Cache with key "products"
        )
    
    ui.Div({ className: "min-h-screen bg-gray-50" }, (ui) => {
        // Navigation
        ui.Div({ className: "bg-white shadow-sm border-b sticky top-0 z-10" }, (ui) => {
            ui.Div({ className: "max-w-6xl mx-auto px-6 py-4 flex items-center gap-4" }, (ui) => {
                ui.append(Link({ 
                    to: '/', 
                    text: '← Home',
                    className: 'text-indigo-600 hover:text-indigo-700 font-semibold'
                }))
                ui.Text({ 
                    value: "Products", 
                    className: "text-2xl font-bold text-gray-900 ml-auto" 
                })
            })
        })

        
        ui.Div({ className: "max-w-6xl mx-auto p-8" }, (ui) => {
            ui.When(loading, (ui) => {
                ui.Text({ value: "Loading products...", className: "text-xl text-gray-500" })
            })
            
            ui.When(watch(error, e => e !== null) as Ref<boolean>, (ui) => {
                ui.Text({ 
                    value: error,
                    formatter: (e) => `Error: ${e}`,
                    className: "text-red-500" 
                })
            })
            
            ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
                ui.List({
                    items: watch(data, d => d?.products || []) as Ref<Product[]>,
                    className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
                    key: (product) => product.id,
                    render: (product, i, ui) => {
                        ui.Div({ 
                            className: "bg-white rounded-xl shadow-sm hover:shadow-lg transition-shadow overflow-hidden border border-gray-200 cursor-pointer",
                            on: {
                                click: () => {
                                    useRouter().push(`/products/${product.id}`)
                                }
                            }
                        }, (ui) => {
                            ui.Div({ className: "p-6" }, (ui) => {
                                ui.Text({ 
                                    value: product.title, 
                                    className: "text-xl font-bold text-gray-900 mb-2" 
                                })
                                ui.Text({
                                    value: `$${product.price}`,
                                    className: "text-2xl font-bold text-indigo-600 mb-3"
                                })
                                ui.Text({
                                    value: product.description.substring(0, 100) + '...',
                                    className: "text-gray-600 text-sm mb-4"
                                })
                                ui.Text({
                                    value: product.category,
                                    className: "inline-block bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-700"
                                })
                            })
                        })
                    }
                })
            })
        })
    })
    })
}

// Product Detail Page (with dynamic :id param)
const ProductDetailPage = () => {
    return Component((ui) => {
        const params = useParams()
    
    const { data, loading, error } = fetchData<Product>(
        () => `https://dummyjson.com/products/${params.value.id}`,
        {cacheKey:`${params.value.id}`}
    )
    
    ui.Div({ className: "min-h-screen bg-gray-50" }, (ui) => {
        // Navigation
        ui.Div({ className: "bg-white shadow-sm border-b sticky top-0 z-10" }, (ui) => {
            ui.Div({ className: "max-w-4xl mx-auto px-6 py-4 flex items-center gap-4" }, (ui) => {
                ui.append(Link({ 
                    to: '/products', 
                    text: '← Back to Products',
                    className: 'text-indigo-600 hover:text-indigo-700 font-semibold'
                }))
            })
        })
        
        ui.Div({ className: "max-w-4xl mx-auto p-8" }, (ui) => {
            ui.When(loading, (ui) => {
                ui.Text({ value: "Loading product...", className: "text-xl text-gray-500" })
            })
            
            ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
                ui.Div({ className: "bg-white rounded-2xl shadow-lg p-8" }, (ui) => {
                    ui.Text({
                        value: data,
                        formatter: (p) => p?.title || '',
                        className: "text-4xl font-bold text-gray-900 mb-4"
                    })
                    ui.Text({
                        value: data,
                        formatter: (p) => `$${p?.price}`,
                        className: "text-3xl font-bold text-indigo-600 mb-6"
                    })
                    ui.Text({
                        value: data,
                        formatter: (p) => p?.description || '',
                        className: "text-gray-700 text-lg leading-relaxed mb-6"
                    })
                    ui.Div({ className: "flex gap-4" }, (ui) => {
                        ui.Text({
                            value: data,
                            formatter: (p) => `Category: ${p?.category}`,
                            className: "bg-gray-100 px-4 py-2 rounded-lg font-medium"
                        })
                        ui.Text({
                            value: params,
                            formatter: (p) => `ID: ${p.id}`,
                            className: "bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg font-medium"
                        })
                    })
                })
            })
        })
    })
    })
}

// ==================== Start Router ====================

router
  .add('/', HomePage)
  .add('/comments', CommentsPage)
  .add('/products', ProductsPage)
  .add('/products/:id', ProductDetailPage)
  .start()