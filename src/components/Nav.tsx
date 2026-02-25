import { A } from "@solidjs/router";

export default function Nav() {
  return (
    <nav class="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-md">
      <div class="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <A href="/" class="font-mono text-lg font-semibold tracking-tight text-zinc-100">
          phoneme
        </A>
        <div class="flex items-center gap-8">
          <A href="/demo" class="text-sm text-zinc-400 transition hover:text-zinc-100" activeClass="!text-brand">
            Demo
          </A>
          <A href="/work/scheduler" class="text-sm text-zinc-400 transition hover:text-zinc-100" activeClass="!text-brand">
            Scheduler
          </A>
          <A href="/work/llvm" class="text-sm text-zinc-400 transition hover:text-zinc-100" activeClass="!text-brand">
            LLVM
          </A>
          <A href="/about" class="text-sm text-zinc-400 transition hover:text-zinc-100" activeClass="!text-brand">
            About
          </A>
        </div>
      </div>
    </nav>
  );
}
