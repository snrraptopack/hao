/**
 * JSX analysis types for code generation
 */

export interface JSXStructure {
  elements: UIElement[]
  conditionals: ConditionalBlock[]
  loops: LoopBlock[]
  expressions: ReactiveExpression[]
}

export interface UIElement {
  tag: string
  props: ElementProp[]
  children: UIElement[]
  events: EventHandler[]
  key?: string
}

export interface ElementProp {
  name: string
  value: string | ReactiveExpression
  isReactive: boolean
}

export interface EventHandler {
  event: string
  handler: string
  isInline: boolean
}

export interface ConditionalBlock {
  condition: ReactiveExpression
  thenBlock: UIElement[]
  elseBlock?: UIElement[]
}

export interface LoopBlock {
  iterable: ReactiveExpression
  itemName: string
  indexName?: string
  body: UIElement[]
}

export interface ReactiveExpression {
  expression: string
  dependencies: string[]
  type: 'text' | 'attribute' | 'condition' | 'loop'
  isWatch: boolean
}