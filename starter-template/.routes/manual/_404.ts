import { Component, Link } from 'auwla'
import type { RouteConfig } from 'auwla'

const NotFoundPage = () => {
  return Component((ui) => {
    ui.Div({ className: "min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center" }, (ui) => {
      ui.Div({ className: "text-center max-w-lg mx-auto px-6" }, (ui) => {
        ui.H1({ 
          text: "404", 
          className: "text-9xl font-bold text-red-500 mb-4" 
        })
        ui.H2({
          text: "Page Not Found",
          className: "text-3xl font-bold text-gray-900 mb-6"
        })
        ui.P({
          text: "The page you're looking for doesn't exist or has been moved.",
          className: "text-lg text-gray-600 mb-8"
        })

        ui.Div({ className: "flex gap-4 justify-center" }, (ui) => {
          ui.append(Link({ 
            to: '/', 
            text: '← Go Home',
            className: 'px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors'
          }))
          
          ui.Button({
            text: "Go Back",
            className: "px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors",
            on: {
              click: () => window.history.back()
            }
          })
        })
      })
    })
  })
}

const route: RouteConfig = {
  path: '*',
  component: NotFoundPage,
  title: '404 - Not Found',
  description: 'Page not found'
}

export default route