import {Component,ref,watch,type Ref} from "./index"


function Counter(){

    const counter = ref(0)
    return Component((ui)=>{
       ui.Div({},(ui)=>{
        ui.P({text:"Count"})
        ui.P({text:watch(counter,()=>`${counter.value}`) as Ref<string>,on:{click:()=> counter.value++}})
       })
    })
}


const app = document.getElementById("app")

if(app) app.append(Counter())