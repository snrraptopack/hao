/**
 * AUWLA DevTools - State Management & Dependency Tracking
 * 
 * This module provides instrumentation hooks for tracking refs, watchers,
 * components, and their dependencies to enable advanced debugging and
 * automatic cleanup strategies.
 */

// -------------------------------------------------------------
// Core Interfaces
// -------------------------------------------------------------

export interface RefNode {
  id: string
  value: any
  createdAt: number
  createdBy: string // file:line
  scope: 'component' | 'global' | 'context'
  accessCount: number
  lastAccessed: number
  watchers: string[] // watcher IDs
  components: string[] // component IDs using this ref
  isOrphaned: boolean // no active watchers/components
  memorySize?: number
}

export interface WatcherNode {
  id: string
  dependencies: string[] // ref IDs
  createdAt: number
  createdBy: string
  triggerCount: number
  lastTriggered: number
  averageExecutionTime: number
  isActive: boolean
}

export interface ComponentNode {
  id: string
  name: string
  element: HTMLElement
  refs: string[] // ref IDs used by this component
  watchers: string[] // watcher IDs created by this component
  mountedAt: number
  unmountedAt?: number
  isActive: boolean
}

export interface ContextNode {
  id: string
  name: string
  provider: string // component/location that provides
  consumers: string[] // component IDs that consume
  value: any
  createdAt: number
}

export interface DependencyGraph {
  nodes: Map<string, GraphNode>
  edges: Map<string, string[]> // ref -> dependent refs/watchers
  orphanedRefs: string[]
  circularDependencies: string[][]
}

export interface GraphNode {
  id: string
  type: 'ref' | 'watcher' | 'component' | 'context'
  dependencies: string[]
  dependents: string[]
}

export interface StateSnapshot {
  timestamp: number
  refs: RefNode[]
  watchers: WatcherNode[]
  components: ComponentNode[]
  contexts: ContextNode[]
  dependencies: DependencyGraph
  memoryUsage: number
  performanceMetrics: PerformanceMetrics
}

export interface PerformanceMetrics {
  refUpdateCount: Map<string, number>
  watcherTriggerCount: Map<string, number>
  averageUpdateTime: Map<string, number>
  batchedUpdates: number
  synchronousUpdates: number
  performanceBottlenecks: PerformanceIssue[]
}

export interface PerformanceIssue {
  type: 'frequent-updates' | 'slow-watcher' | 'circular-dependency' | 'memory-leak'
  refId?: string
  watcherId?: string
  severity: 'low' | 'medium' | 'high'
  suggestion: string
  impact: string
}

// -------------------------------------------------------------
// DevTools Hooks Interface
// -------------------------------------------------------------

export interface DevToolsHooks {
  onRefCreated(ref: any, location: string, scope: string): void
  onRefAccessed(refId: string, accessor: string): void
  onRefUpdated(refId: string, oldValue: any, newValue: any): void
  onWatcherCreated(watcher: any, dependencies: any[], scope: string): void
  onWatcherDestroyed(watcherId: string): void
  onWatchTriggered(watcherId: string, changedDeps: string[], executionTime: number): void
  onComponentCreated(name: string, context: any, props: any): void
  onComponentDestroyed(name: string, context: any): void
  onComponentMount(name: string, element: HTMLElement, refs: string[]): void
  onComponentUnmount(name: string, refs: string[]): void
  onContextCreated(contextId: string, name: string, provider: string): void
  onContextConsumed(contextId: string, consumer: string): void
}

// -------------------------------------------------------------
// DevTools Data Collector
// -------------------------------------------------------------

class DevToolsCollector implements DevToolsHooks {
  private refs = new Map<string, RefNode>()
  private watchers = new Map<string, WatcherNode>()
  private components = new Map<string, ComponentNode>()
  private contexts = new Map<string, ContextNode>()
  private dependencyGraph: DependencyGraph = {
    nodes: new Map(),
    edges: new Map(),
    orphanedRefs: [],
    circularDependencies: []
  }
  private performanceMetrics: PerformanceMetrics = {
    refUpdateCount: new Map(),
    watcherTriggerCount: new Map(),
    averageUpdateTime: new Map(),
    batchedUpdates: 0,
    synchronousUpdates: 0,
    performanceBottlenecks: []
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  private getStackTrace(): string {
    const stack = new Error().stack || ''
    const lines = stack.split('\n')
    // Skip first 3 lines (Error, this function, caller)
    const relevantLine = lines[3] || 'unknown'
    const match = relevantLine.match(/at.*\((.+):(\d+):(\d+)\)/) || 
                  relevantLine.match(/at (.+):(\d+):(\d+)/)
    return match ? `${match[1]}:${match[2]}` : 'unknown'
  }

  onRefCreated(ref: any, location: string, scope: string): void {
    const id = this.generateId()
    const refNode: RefNode = {
      id,
      value: ref.value,
      createdAt: Date.now(),
      createdBy: location || this.getStackTrace(),
      scope: scope as any,
      accessCount: 0,
      lastAccessed: Date.now(),
      watchers: [],
      components: [],
      isOrphaned: false
    }

    this.refs.set(id, refNode)
    
    // Store ID on ref for tracking
    ;(ref as any).__devtools_id = id

    this.updateDependencyGraph()
    this.detectOrphanedRefs()
  }

  onRefAccessed(refId: string, accessor: string): void {
    const refNode = this.refs.get(refId)
    if (refNode) {
      refNode.accessCount++
      refNode.lastAccessed = Date.now()
    }
  }

  onRefUpdated(refId: string, oldValue: any, newValue: any): void {
    const refNode = this.refs.get(refId)
    if (refNode) {
      refNode.value = newValue
      
      // Update performance metrics
      const updateCount = this.performanceMetrics.refUpdateCount.get(refId) || 0
      this.performanceMetrics.refUpdateCount.set(refId, updateCount + 1)
      
      // Detect frequent updates (potential performance issue)
      if (updateCount > 100) {
        this.addPerformanceIssue({
          type: 'frequent-updates',
          refId,
          severity: 'medium',
          suggestion: 'Consider debouncing or batching updates to this ref',
          impact: 'High update frequency may cause performance issues'
        })
      }
    }
  }

  onWatcherCreated(watcher: any, dependencies: any[], scope: string): void {
    const id = this.generateId()
    const watcherNode: WatcherNode = {
      id,
      dependencies: dependencies.map(dep => (dep as any).__devtools_id).filter(Boolean),
      createdAt: Date.now(),
      createdBy: this.getStackTrace(),
      triggerCount: 0,
      lastTriggered: 0,
      averageExecutionTime: 0,
      isActive: true
    }

    this.watchers.set(id, watcherNode)
    
    // Store ID on watcher for tracking
    ;(watcher as any).__devtools_id = id

    // Update ref dependencies
    watcherNode.dependencies.forEach(refId => {
      const refNode = this.refs.get(refId)
      if (refNode && !refNode.watchers.includes(id)) {
        refNode.watchers.push(id)
      }
    })

    this.updateDependencyGraph()
    this.detectCircularDependencies()
  }

  onWatcherDestroyed(watcherId: string): void {
    const watcherNode = this.watchers.get(watcherId)
    if (watcherNode) {
      watcherNode.isActive = false
      
      // Remove watcher from ref dependencies
      watcherNode.dependencies.forEach(refId => {
        const refNode = this.refs.get(refId)
        if (refNode) {
          const index = refNode.watchers.indexOf(watcherId)
          if (index > -1) {
            refNode.watchers.splice(index, 1)
          }
        }
      })

      this.detectOrphanedRefs()
    }
  }

  onComponentCreated(name: string, context: any, props: any): void {
    const id = this.generateId()
    const componentNode: ComponentNode = {
      id,
      name,
      element: null as any, // Will be set on mount
      refs: [],
      watchers: [],
      mountedAt: Date.now(),
      isActive: true
    }

    this.components.set(id, componentNode)
    
    // Store ID on context for tracking
    ;(context as any).__devtools_id = id
  }

  onComponentDestroyed(name: string, context: any): void {
    const componentId = (context as any).__devtools_id
    const component = this.components.get(componentId)
    
    if (component) {
      component.isActive = false
      component.unmountedAt = Date.now()

      // Remove component from ref dependencies
      component.refs.forEach(refId => {
        const refNode = this.refs.get(refId)
        if (refNode) {
          const index = refNode.components.indexOf(componentId)
          if (index > -1) {
            refNode.components.splice(index, 1)
          }
        }
      })

      this.detectOrphanedRefs()
    }
  }

  onWatchCreated(watcherId: string, dependencies: string[], location: string): void {
    const watcherNode: WatcherNode = {
      id: watcherId,
      dependencies,
      createdAt: Date.now(),
      createdBy: location || this.getStackTrace(),
      triggerCount: 0,
      lastTriggered: 0,
      averageExecutionTime: 0,
      isActive: true
    }

    this.watchers.set(watcherId, watcherNode)

    // Update ref dependencies
    dependencies.forEach(refId => {
      const refNode = this.refs.get(refId)
      if (refNode && !refNode.watchers.includes(watcherId)) {
        refNode.watchers.push(watcherId)
      }
    })

    this.updateDependencyGraph()
    this.detectCircularDependencies()
  }

  onWatchTriggered(watcherId: string, changedDeps: string[], executionTime: number): void {
    const watcherNode = this.watchers.get(watcherId)
    if (watcherNode) {
      watcherNode.triggerCount++
      watcherNode.lastTriggered = Date.now()
      
      // Update average execution time
      const totalTime = watcherNode.averageExecutionTime * (watcherNode.triggerCount - 1) + executionTime
      watcherNode.averageExecutionTime = totalTime / watcherNode.triggerCount

      // Update performance metrics
      const triggerCount = this.performanceMetrics.watcherTriggerCount.get(watcherId) || 0
      this.performanceMetrics.watcherTriggerCount.set(watcherId, triggerCount + 1)

      // Detect slow watchers
      if (executionTime > 16) { // > 1 frame
        this.addPerformanceIssue({
          type: 'slow-watcher',
          watcherId,
          severity: 'high',
          suggestion: 'Optimize watcher computation or consider debouncing',
          impact: `Watcher takes ${executionTime.toFixed(2)}ms, may block UI`
        })
      }
    }
  }

  onComponentMount(name: string, element: HTMLElement, refs: string[]): void {
    const id = this.generateId()
    const componentNode: ComponentNode = {
      id,
      name,
      element,
      refs,
      watchers: [],
      mountedAt: Date.now(),
      isActive: true
    }

    this.components.set(id, componentNode)

    // Update ref components
    refs.forEach(refId => {
      const refNode = this.refs.get(refId)
      if (refNode && !refNode.components.includes(id)) {
        refNode.components.push(id)
      }
    })

    this.detectOrphanedRefs()
  }

  onComponentUnmount(name: string, refs: string[]): void {
    // Find component by name and refs
    const component = Array.from(this.components.values())
      .find(c => c.name === name && c.isActive)
    
    if (component) {
      component.isActive = false
      component.unmountedAt = Date.now()

      // Remove component from ref dependencies
      refs.forEach(refId => {
        const refNode = this.refs.get(refId)
        if (refNode) {
          const index = refNode.components.indexOf(component.id)
          if (index > -1) {
            refNode.components.splice(index, 1)
          }
        }
      })

      this.detectOrphanedRefs()
    }
  }

  onContextCreated(contextId: string, name: string, provider: string): void {
    const contextNode: ContextNode = {
      id: contextId,
      name,
      provider,
      consumers: [],
      value: null,
      createdAt: Date.now()
    }

    this.contexts.set(contextId, contextNode)
  }

  onContextConsumed(contextId: string, consumer: string): void {
    const contextNode = this.contexts.get(contextId)
    if (contextNode && !contextNode.consumers.includes(consumer)) {
      contextNode.consumers.push(consumer)
    }
  }

  private updateDependencyGraph(): void {
    this.dependencyGraph.nodes.clear()
    this.dependencyGraph.edges.clear()

    // Add ref nodes
    this.refs.forEach((refNode, id) => {
      this.dependencyGraph.nodes.set(id, {
        id,
        type: 'ref',
        dependencies: [],
        dependents: refNode.watchers
      })
    })

    // Add watcher nodes and edges
    this.watchers.forEach((watcherNode, id) => {
      this.dependencyGraph.nodes.set(id, {
        id,
        type: 'watcher',
        dependencies: watcherNode.dependencies,
        dependents: []
      })

      // Create edges from refs to watchers
      watcherNode.dependencies.forEach(refId => {
        const edges = this.dependencyGraph.edges.get(refId) || []
        if (!edges.includes(id)) {
          edges.push(id)
          this.dependencyGraph.edges.set(refId, edges)
        }
      })
    })
  }

  // Made public to allow UI to trigger recalculation proactively
  detectOrphanedRefs(): void {
    this.dependencyGraph.orphanedRefs = []
    
    this.refs.forEach((refNode, id) => {
      const hasActiveWatchers = refNode.watchers.some(watcherId => 
        this.watchers.get(watcherId)?.isActive
      )
      const hasActiveComponents = refNode.components.some(componentId =>
        this.components.get(componentId)?.isActive
      )

      refNode.isOrphaned = !hasActiveWatchers && !hasActiveComponents
      
      if (refNode.isOrphaned) {
        this.dependencyGraph.orphanedRefs.push(id)
      }
    })
  }

  private detectCircularDependencies(): void {
    // Simple cycle detection using DFS
    const visited = new Set<string>()
    const recursionStack = new Set<string>()
    const cycles: string[][] = []

    const dfs = (nodeId: string, path: string[]): void => {
      if (recursionStack.has(nodeId)) {
        // Found cycle
        const cycleStart = path.indexOf(nodeId)
        if (cycleStart !== -1) {
          cycles.push(path.slice(cycleStart))
        }
        return
      }

      if (visited.has(nodeId)) return

      visited.add(nodeId)
      recursionStack.add(nodeId)

      const edges = this.dependencyGraph.edges.get(nodeId) || []
      edges.forEach(dependentId => {
        dfs(dependentId, [...path, nodeId])
      })

      recursionStack.delete(nodeId)
    }

    this.dependencyGraph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        dfs(nodeId, [])
      }
    })

    this.dependencyGraph.circularDependencies = cycles
  }

  private addPerformanceIssue(issue: PerformanceIssue): void {
    // Avoid duplicate issues
    const exists = this.performanceMetrics.performanceBottlenecks.some(
      existing => existing.type === issue.type && 
                 existing.refId === issue.refId &&
                 existing.watcherId === issue.watcherId
    )

    if (!exists) {
      this.performanceMetrics.performanceBottlenecks.push(issue)
    }
  }

  // Public API for DevTools UI
  getSnapshot(): StateSnapshot {
    return {
      timestamp: Date.now(),
      refs: Array.from(this.refs.values()),
      watchers: Array.from(this.watchers.values()),
      components: Array.from(this.components.values()),
      contexts: Array.from(this.contexts.values()),
      dependencies: this.dependencyGraph,
      memoryUsage: this.estimateMemoryUsage(),
      performanceMetrics: this.performanceMetrics
    }
  }

  // Convenience wrapper used by UI and examples
  getStateSnapshot(): StateSnapshot {
    return this.getSnapshot()
  }

  // Expose the dependency graph to the UI
  getDependencyGraph(): DependencyGraph {
    return this.dependencyGraph
  }

  getOrphanedRefs(): RefNode[] {
    return this.dependencyGraph.orphanedRefs
      .map(id => this.refs.get(id))
      .filter(Boolean) as RefNode[]
  }

  getCleanupCandidates(): RefNode[] {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    return Array.from(this.refs.values()).filter(ref => 
      ref.isOrphaned || ref.lastAccessed < fiveMinutesAgo
    )
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of memory usage
    let totalSize = 0
    
    this.refs.forEach(ref => {
      totalSize += JSON.stringify(ref.value).length * 2 // rough byte estimate
    })
    
    return totalSize
  }

  // Cleanup methods
  cleanupRef(refId: string): boolean {
    const refNode = this.refs.get(refId)
    if (refNode && refNode.isOrphaned) {
      this.refs.delete(refId)
      return true
    }
    return false
  }

  cleanupOrphanedRefs(): number {
    let cleaned = 0
    this.getOrphanedRefs().forEach(ref => {
      if (this.cleanupRef(ref.id)) {
        cleaned++
      }
    })
    return cleaned
  }
}

// -------------------------------------------------------------
// Global DevTools Instance
// -------------------------------------------------------------

let devToolsInstance: DevToolsCollector | null = null

export function initDevTools(): DevToolsCollector {
  if (!devToolsInstance) {
    devToolsInstance = new DevToolsCollector()
    
    // Expose to window for browser extension
    if (typeof window !== 'undefined') {
      ;(window as any).__AUWLA_DEVTOOLS__ = devToolsInstance
    }
  }
  
  return devToolsInstance
}

export function getDevTools(): DevToolsCollector | null {
  return devToolsInstance
}

// Development mode check
// Robust dev-mode detection across bundlers/environments
// Prefer Vite/ESM `import.meta.env.DEV`, fall back to NODE_ENV, allow manual override
export function isDevEnv(): boolean {
  try {
    // Vite/ESM replacement happens at build time
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const viteDev = typeof import.meta !== 'undefined' && (import.meta as any)?.env?.DEV === true
    const nodeDev = typeof process !== 'undefined' && process?.env?.NODE_ENV === 'development'
    const forced = typeof window !== 'undefined' && (window as any).__AUWLA_DEVTOOLS_FORCE_DEV__ === true
    return !!(viteDev || nodeDev || forced)
  } catch {
    return false
  }
}

// Helper to conditionally call DevTools hooks
export function devHook<T extends keyof DevToolsHooks>(
  method: T,
  ...args: Parameters<DevToolsHooks[T]>
): void {
  if (isDevEnv() && devToolsInstance) {
    ;(devToolsInstance[method] as any)(...args)
  }
}