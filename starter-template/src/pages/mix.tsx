//@page/mix
import {ref } from "auwla"

const toggle = ref(false)

function handleToggle(){
    toggle.value = !toggle.value
}

export default function Mix() {
    const counter = ref(0)
    
    function inc(){
        counter.value += 1
    }
    
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">About Page</h1>
            <p>The count is {counter.value}</p>
            <button onClick={inc}>Increment</button>
            <button onClick={handleToggle}>Toggle</button>
            {$if(counter.value > 0, <p>hello</p>)}
        </div>
    )
}