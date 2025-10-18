import { Component, ref } from 'auwla'

interface Props {
  name: string
}

const greeting = ref('Hello')

export default Component((ui) => {
  ui.Div({}, (ui) => {
    ui.H1({ text: watch([greeting], () => String(greeting.value) + "," + String(name) + "!") })
  })
})
