import {defineHook} from "auwsomebridge"

export const Counter = defineHook({
  name:"counter",

  before:async (ctx)=>{
    return {next: true}
  },
})
