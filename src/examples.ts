import { Component } from "./dsl"
import { ref, watch, type Ref } from "./state"
import { onMount, onUnmount } from "./lifecycle"

// Example 1: Manual data fetching with onMount
export const ManualFetchExample = Component((ui) => {
    const count = ref(0)
    const data = ref<any>(null)
    
    onMount(() => {
        console.log('Component mounted!')
        
        // Fetch data manually
        fetch('https://jsonplaceholder.typicode.com/users/1')
            .then(res => res.json())
            .then(json => data.value = json)
        
        // Setup interval
        const interval = setInterval(() => {
            count.value++
        }, 1000)
        
        // Return cleanup function
        return () => {
            console.log('Cleaning up interval')
            clearInterval(interval)
        }
    })
    
    onUnmount(() => {
        console.log('Component unmounted!')
    })
    
    ui.Div({ className: "p-8" }, (ui) => {
        ui.Text({ 
            value: count,
            formatter: (v) => `Count: ${v}`,
            className: "text-2xl font-bold"
        })
        
        ui.When(watch(data, d => d !== null) as Ref<boolean>, (ui) => {
            ui.Text({
                value: data,
                formatter: (d) => `User: ${d.name}`,
                className: "mt-4 text-lg"
            })
        })
    })
})

// Example 2: Using fetch helper
import { fetch as fetchData } from "./fetch"

type Todo = {
    id: number
    title: string
    completed: boolean
}

export const FetchHelperExample = Component((ui) => {
    const { data, loading, error, refetch } = fetchData<Todo[]>(
        'https://jsonplaceholder.typicode.com/todos?_limit=5'
    )
    
    ui.Div({ className: "p-8" }, (ui) => {
        ui.Text({ 
            value: "Todo List", 
            className: "text-3xl font-bold mb-4" 
        })
        
        ui.Button({
            text: "Refetch",
            className: "mb-4 px-4 py-2 bg-indigo-600 text-white rounded-lg",
            on: { click: () => refetch() }
        })
        
        ui.When(loading, (ui) => {
            ui.Text({ value: "Loading...", className: "text-gray-500" })
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
                items: data as Ref<Todo[]>,
                className: "space-y-2",
                key: (todo) => todo.id,
                render: (todo, i, ui) => {
                    ui.Div({ className: "flex items-center gap-2" }, (ui) => {
                        ui.Text({
                            value: todo.completed ? "✅" : "⬜",
                            className: "text-xl"
                        })
                        ui.Text({
                            value: todo.title,
                            className: "text-gray-700"
                        })
                    })
                }
            })
        })
    })
})
