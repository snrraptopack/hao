//@page
import {ref } from "auwla"

const counter = ref(0)

function inc(){
  counter.value += 1
}

export default function AboutPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">About Page</h1>
      <p>The count is {counter.value}</p>
      <button onClick={inc} onDoubleClick={inc}></button>
    </div>
  )
}