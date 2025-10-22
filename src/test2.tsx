import { ref } from "auwla" // this is where the dsl comes from our published package


const counter = ref(0)

function inc(){
    counter.value += 1
}

export default function One(){

    return(
       <div>
        <p>{counter.value}</p>
        <button onClick={inc}>inc</button>
       </div>
    )
}

// pay attension to the scoping issue



export default function One(){

    const counter = ref(0)

    function inc(){
        counter.value += 1
    }

    return(
       <div>
        <p>{counter.value}</p>
        <button onClick={inc}>inc</button>
       </div>
    )
}