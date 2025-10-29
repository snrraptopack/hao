import { h, Link } from 'auwla'

export function Landing() {
  return (
    <div class="h-full flex items-center justify-center">
      <section class="max-w-3xl mx-auto space-y-6 text-center">
        <h1 class="text-4xl sm:text-5xl font-semibold tracking-tight">Build <span class="paint-slash brand-text">interfaces</span> with focus and flow.</h1>
        <p class="text-gray-700 leading-7">
          Auwla keeps JSX familiar and makes state and routing straightforward. It’s small,
          pragmatic, and designed to help you ship without ceremony.
        </p>
        <div class="flex justify-center gap-3">
          <Link to="/docs/quick-start" text="Get Started" className="brand-bg text-white px-5 py-2.5 rounded-md shadow-md hover:shadow-lg hover:-translate-y-0.5 transition duration-200 ease-out" activeClassName="brand-bg text-white" />
          <Link to="/docs/quick-start" text="Read Docs" className="px-5 py-2.5 rounded-md border brand-border text-gray-800 hover:bg-gray-50 hover:-translate-y-0.5 transition duration-200 ease-out" activeClassName="bg-gray-100" />
        </div>
      </section>
    </div>
  ) as HTMLElement
}