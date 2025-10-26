import {Component,ref,watch,type Ref} from "./index"


function Counter(){

    const counter = ref(0)
    return Component((ui)=>{
        ui.Button({
            text: watch(counter,(v)=> `Clicked ${v} times`) as Ref<string>,
            on:{click:()=>counter.value++}
        })
    })
}


