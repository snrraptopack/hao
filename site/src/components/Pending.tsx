
export function Pending() {
  return () => (
    <div class="w-full max-w-3xl mx-auto py-8 px-4 lg:px-8">
      <div class="animate-pulse space-y-8">
        {/* Breadcrumb trail skeleton */}
        <div class="flex items-center gap-2">
          <div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
          <span class="text-slate-300 dark:text-slate-700 text-xs">/</span>
          <div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
        </div>

        {/* Main Title & Metadata skeleton */}
        <div class="space-y-4">
          <div class="h-10 bg-slate-350 dark:bg-slate-700 rounded-lg w-2/3"></div>
          <div class="flex items-center gap-4">
            <div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
            <div class="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-24"></div>
          </div>
        </div>

        {/* Separator line */}
        <div class="border-b border-slate-200 dark:border-slate-800/80"></div>

        {/* Body content paragraph 1 */}
        <div class="space-y-3">
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-11/12"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-4/5"></div>
        </div>

        {/* Mock Code Block Container */}
        <div class="bg-slate-50 dark:bg-[#1a1c25] border border-slate-250/60 dark:border-[#262936] rounded-xl p-6 space-y-3">
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
        </div>

        {/* Body content paragraph 2 */}
        <div class="space-y-3">
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          <div class="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  );
}

