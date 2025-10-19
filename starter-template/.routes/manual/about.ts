import { Component, Link } from 'auwla'
import type { RouteConfig } from 'auwla'

const AboutPage = () => {
  return Component((ui) => {
    ui.Div({ className: "min-h-screen bg-gray-50" }, (ui) => {
      // Navigation
      ui.Div({ className: "bg-white shadow-sm border-b" }, (ui) => {
        ui.Div({ className: "max-w-4xl mx-auto px-6 py-4 flex items-center gap-4" }, (ui) => {
          ui.append(Link({ 
            to: '/', 
            text: '← Home',
            className: 'text-indigo-600 hover:text-indigo-700 font-semibold'
          }))
          ui.H1({ 
            text: "About Auwla", 
            className: "text-2xl font-bold text-gray-900 ml-auto" 
          })
        })
      })
      
      // Content
      ui.Div({ className: "max-w-4xl mx-auto p-8" }, (ui) => {
        ui.Div({ className: "bg-white rounded-xl shadow-lg p-8" }, (ui) => {
          ui.H2({ 
            text: "What is Auwla?", 
            className: "text-3xl font-bold text-gray-900 mb-6" 
          })
          
          ui.P({
            text: "Auwla is a lightweight, reactive UI framework built from scratch with TypeScript. It features reactive state management, efficient DOM diffing, lifecycle hooks, and a full SPA router—all with zero dependencies.",
            className: "text-lg text-gray-700 mb-6 leading-relaxed"
          })
          
          ui.H3({ 
            text: "Key Features", 
            className: "text-2xl font-bold text-gray-900 mb-4" 
          })
          
          ui.Ul({ className: "space-y-3 text-gray-700" }, (ui) => {
            ui.Li({ text: "🔄 Reactive State - Proxy-based reactivity with subscription model" })
            ui.Li({ text: "🧩 Component System - Chainable DSL for building UIs" })
            ui.Li({ text: "🎯 Lifecycle Hooks - onMount / onUnmount with automatic cleanup" })
            ui.Li({ text: "📊 Efficient Lists - Keyed diffing for O(1) updates" })
            ui.Li({ text: "🚦 SPA Router - Dynamic routes, guards, query params, caching" })
            ui.Li({ text: "📦 TypeScript - Full type safety throughout" })
            ui.Li({ text: "🚀 Zero Dependencies - No external runtime bloat" })
          })
          
          ui.Div({ className: "mt-8 pt-6 border-t" }, (ui) => {
            ui.P({
              text: "Ready to build something amazing?",
              className: "text-lg text-gray-600 mb-4"
            })
            
            ui.append(Link({ 
              to: '/', 
              text: 'Get Started',
              className: 'inline-block px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors'
            }))
          })
        })
      })
    })
  })
}
const
 route: RouteConfig = {
  path: '/about',
  component: AboutPage,
  title: 'About',
  description: 'Learn about Auwla Framework'
}

export default route