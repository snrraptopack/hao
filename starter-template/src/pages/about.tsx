import { ref } from "auwla"

const hello = ref(10)

setInterval(() => {
    hello.value += 1
}, 1000)

export default function AboutPage() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold mb-4">About Page</h1>
            <p>Hello world: {hello.value}</p>
            <p>This counter updates every second!</p>
        </div>
    )
}