import { Component, Link } from 'auwla'
import type { RouteConfig } from 'auwla'

const HomePage = () => {
  return Component((ui) => {
    ui.Div({ className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center" }, (ui) => {
      ui.Div({ className: "text-center max-w-2xl mx-auto px-6" }, (ui) => {
        ui.H1({ 
          text: "🚀 Welcome to Auwla", 
          className: "text-6xl font-bold mb-6 text-gray-900" 
        })
        ui.P({
          text: "A lightweight, reactive UI framework with blazing-fast performance",
          className: "text-xl text-gray-600 mb-12 leading-relaxed"
        })

        ui.Div({ className: "flex gap-4 justify-center flex-wrap" }, (ui) => {
          ui.append(Link({ 
            to: '/about', 
            text: 'Learn More',
            className: 'px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg'
          }))
          
          ui.Button({
            text: "View Docs",
            className: "px-8 py-4 bg-white text-indigo-600 border-2 border-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg",
            on: {
              click: () => window.open('https://github.com/your-repo/auwla', '_blank')
            }
          })
        })
      })
    })
  })
}

const route: RouteConfig = {
  path: '/',
  component: HomePage,
  title: 'Home',
  description: 'Welcome to Auwla Framework'
}

export default route