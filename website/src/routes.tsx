import { h, defineRoutes, group, composeRoutes } from 'auwla'
import { SiteLayout } from './layouts/SiteLayout'
import { DocsLayout } from './layouts/DocsLayout'
import { Landing } from './pages/Landing'
import { DocsIntro } from './pages/docs/Intro'
import { DocsQuickStart } from './pages/docs/QuickStart'
import { DocsInstallation } from './pages/docs/Installation'
import { DocsBeginner } from './pages/docs/Beginner'
import { DocsIntermediate } from './pages/docs/Intermediate'
import { DocsAdvanced } from './pages/docs/Advanced'
import { DocsAPIReference } from './pages/docs/APIReference'
import { DocsJSXGuide } from './pages/docs/JSXGuide'
import { DocsCreatingApplication } from './pages/docs/CreatingApplication'
import { DocsTemplateSyntax } from './pages/docs/TemplateSyntax'
import { DocsComponents } from './pages/docs/Components'
import { DocsReactivity } from './pages/docs/reactivity/Reactivity'
import { DocsRefWatch } from './pages/docs/reactivity/RefAndWatch'
import { DocsConditionalRendering } from './pages/docs/reactivity/ConditionalRendering'
import { DocsListRendering } from './pages/docs/reactivity/ListRendering'
import { DocsReactiveComposition } from './pages/docs/reactivity/ReactiveComposition'
import { DocsEvents } from './pages/docs/Events'
import { DocsStyling } from './pages/docs/Styling'
import { DocsLifecycleAndDataFetching } from './pages/docs/LifecycleAndDataFetching'
import { DocsRoutingIntroduction } from './pages/docs/routing/Introduction'
import { DocsRoutesComposition } from './pages/docs/routing/RoutesComposition'
import { DocsParamsAndQuery } from './pages/docs/routing/ParamsAndQuery'
import { DocsRoutingTips } from './pages/docs/routing/Tips'


const landingPageRoute = group("/",{layout:SiteLayout},[{path:"/",component:Landing,name:"landing page"}])

const docsRoutes = group("/docs",{layout:DocsLayout},[
  { path: '/', component: DocsIntro, name: 'docs-intro' },
  { path: '/installation', component: DocsInstallation, name: 'docs-installation' },
  { path: '/quick-start', component: DocsQuickStart, name: 'docs-quick' },
  { path: '/creating-an-application', component: DocsCreatingApplication, name: 'docs-create-app' },
  { path: '/template-syntax', component: DocsTemplateSyntax, name: 'docs-template' },
  { path: '/components', component: DocsComponents, name: 'docs-components' },
  { path: '/lifecycle-and-data-fetching', component: DocsLifecycleAndDataFetching, name: 'docs-lifecycle-fetch' },
  { path: '/events', component: DocsEvents, name: 'docs-events' },
  { path: '/styling', component: DocsStyling, name: 'docs-styling' },
  { path: '/beginner', component: DocsBeginner, name: 'docs-beginner' },
  { path: '/intermediate', component: DocsIntermediate, name: 'docs-intermediate' },
  { path: '/advanced', component: DocsAdvanced, name: 'docs-advanced' },
  { path: '/api-reference', component: DocsAPIReference, name: 'docs-api' },
  { path: '/jsx-guide', component: DocsJSXGuide, name: 'docs-jsx' },
])

const reactivityRoutes = group('/docs/reactivity', { layout: DocsLayout }, [
  { path: '/', component: DocsReactivity, name: 'docs-reactivity' },
  { path: '/ref-and-watch', component: DocsRefWatch, name: 'docs-ref-watch' },
  { path: '/conditional-rendering', component: DocsConditionalRendering, name: 'docs-conditional' },
  { path: '/list-rendering', component: DocsListRendering, name: 'docs-list-rendering' },
  { path: '/composition', component: DocsReactiveComposition, name: 'docs-reactive-composition' },
])

const routingRoutes = group('/docs/routing', { layout: DocsLayout }, [
  { path: '/', component: DocsRoutingIntroduction, name: 'docs-routing-introduction' },
  { path: '/composition', component: DocsRoutesComposition, name: 'docs-routes-composition' },
  { path: '/params-and-query', component: DocsParamsAndQuery, name: 'docs-params-query' },
  { path: '/tips', component: DocsRoutingTips, name: 'docs-routing-tips' },
])

const composed = composeRoutes(landingPageRoute, docsRoutes, reactivityRoutes, routingRoutes)

export default composed