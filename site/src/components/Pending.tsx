
export function Pending() {
    return () => (
      <div class="w-full flex center">
        <div class="animate-pulse space-y-4 py-8 max-w-3xl">
          <div class="h-10 bg-slate-200/80 rounded-md w-1/3"></div>
          <div class="h-4 bg-slate-200/80 rounded-md w-3/4"></div>
          <div class="h-4 bg-slate-200/80 rounded-md w-5/6"></div>
          <div class="h-4 bg-slate-200/80 rounded-md w-2/3"></div>
        </div>
     </div>
    );
}
