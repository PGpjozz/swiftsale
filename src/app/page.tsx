import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900">
              <Image src="/vercel.svg" alt="Logo" width={16} height={16} />
            </div>
            <div className="text-lg font-semibold tracking-tight">SwiftSale</div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/login"
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
            >
              Login
            </a>
            <a
              href="/signup"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Start free
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Retail POS + Inventory,
              <span className="text-zinc-600"> built for SaaS.</span>
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-zinc-600 md:text-lg">
              Onboard stores, manage products and stock, and run fast checkout.
              SwiftSale is designed to scale from your first store to hundreds.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="/signup"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Create store account
              </a>
              <a
                href="/app"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
              >
                View dashboard
              </a>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3 text-sm text-zinc-700">
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="font-medium">Multi-tenant</div>
                <div className="mt-1 text-xs text-zinc-600">Tenant isolation by default.</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="font-medium">Billing ready</div>
                <div className="mt-1 text-xs text-zinc-600">Onboarding + monthly plans.</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="font-medium">Fast checkout</div>
                <div className="mt-1 text-xs text-zinc-600">Keyboard + barcode flow.</div>
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <div className="font-medium">Inventory audit</div>
                <div className="mt-1 text-xs text-zinc-600">Movements and stock on hand.</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-6">
            <div className="text-sm font-medium">Demo</div>
            <div className="mt-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
              <div className="text-xs text-zinc-500">Today</div>
              <div className="mt-2 text-2xl font-semibold tracking-tight">Sales: 12,480</div>
              <div className="mt-1 text-sm text-zinc-600">Items sold: 146</div>
              <div className="mt-4 grid gap-2">
                <div className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
                  <span>Low stock: Mineral Water 500ml</span>
                  <span className="font-medium text-amber-700">8 left</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white p-3 text-sm">
                  <span>Top product: Rice 2kg</span>
                  <span className="font-medium">42</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 text-sm text-zinc-600 md:px-8">
          © {new Date().getFullYear()} SwiftSale. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
