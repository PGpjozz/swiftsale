import Link from "next/link";

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="text-xl font-semibold tracking-tight">Create your store</div>
          <p className="mt-1 text-sm text-zinc-600">
            Set up your tenant. Billing comes next.
          </p>

          <form className="mt-6 space-y-4">
            <div>
              <label className="text-sm font-medium text-zinc-800">Store name</label>
              <input
                type="text"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Swift Mart"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Owner email</label>
              <input
                type="email"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="owner@swiftmart.com"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-zinc-800">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="••••••••"
              />
            </div>

            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800"
            >
              Create account
            </button>
          </form>

          <div className="mt-6 text-sm text-zinc-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-zinc-950">
              Login
            </Link>
            .
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500">
          <Link href="/" className="hover:text-zinc-700">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
