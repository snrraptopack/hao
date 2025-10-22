import { Component,watch,type Ref, ref } from "auwla"




export default function one(){

    const counter = ref(0)

    function inc(){
        counter.value += 1
    }


    return Component((ui)=>{
        ui.P({text:watch(counter,()=> `${counter.value}`)as Ref<string>})
        ui.Button({text:"inc",on:{click:()=>inc}})
    })
}


export default function one(){

    return Component((ui)=>{
        const counter = ref(0)

    function inc(){
        counter.value += 1
    }

        ui.P({text:watch(counter,()=> `${counter.value}`)as Ref<string>})
        ui.Button({text:"inc",on:{click:()=>inc}})
    })
}