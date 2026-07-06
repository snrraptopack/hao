export default function CopyInstallButton() {
  let copied = false;

  function copyInstall() {
    navigator.clipboard.writeText('npm install auwla');
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }

  return () => (
    <button
      onClick={copyInstall}
      class="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 font-mono text-sm text-slate-600 px-4 py-3 transition group select-none"
    >
      <span class="text-[#ff3e00] font-bold">$</span>
      <span>npm install auwla</span>
      <span class="ml-4 text-xs font-bold text-slate-500 group-hover:text-slate-600">
        {copied ? 'Copied!' : 'Copy'}
      </span>
    </button>
  );
}
