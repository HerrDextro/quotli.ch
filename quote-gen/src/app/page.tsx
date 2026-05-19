import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <span className="text-xl font-bold text-gray-900">Quotli</span>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Log in
          </Link>
          <Link
            href="/sign-up"
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Start free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-12 text-center sm:pt-24">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          Stop losing evenings to paperwork.
          <br />
          <span className="text-indigo-600">
            Send professional quotes in 30 seconds.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-gray-600">
          Just describe the job. Quotli writes the quote, builds the PDF, and
          emails it to your client — while you&apos;re still on site.
        </p>
        <div className="mt-8">
          <Link
            href="/sign-up"
            className="inline-block rounded-lg bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-indigo-700"
          >
            Try it free for 14 days
          </Link>
          <p className="mt-3 text-sm text-gray-500">
            No credit card needed.
          </p>
        </div>
      </section>

      {/* Pain point */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <p className="text-xl font-medium text-gray-900">
            Every quote you write by hand is an hour you didn&apos;t charge
            for.
          </p>
          <p className="mt-4 text-base leading-relaxed text-gray-600">
            Most contractors spend 6–10 hours a week on quotes, proposals, and
            follow-ups. That&apos;s $600–$1,000 of unbillable time — every
            single week.
          </p>
          <p className="mt-4 text-lg font-semibold text-indigo-600">
            There&apos;s a better way.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            How it works
          </h2>

          <div className="mt-12 grid gap-12 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                1
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Describe the job in plain English
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                No forms. No templates. Just tell Quotli what the job
                involves — materials, labour, scope.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                2
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Review and adjust
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Your quote appears in seconds, fully itemised. Edit any line
                before generating.
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">
                3
              </div>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                Send to your client
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Download the branded PDF or email it directly. Done.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-3xl px-6">
          <div className="space-y-8">
            <blockquote className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-base italic leading-relaxed text-gray-700">
                &ldquo;I used to spend Sunday nights doing quotes. Now I do them
                in the truck before I drive away.&rdquo;
              </p>
              <footer className="mt-3 text-sm font-medium text-gray-500">
                — Mike R., roofing contractor
              </footer>
            </blockquote>

            <blockquote className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-base italic leading-relaxed text-gray-700">
                &ldquo;Closed a $12,000 job because I sent the quote 20 minutes
                after the walkthrough. Client said no one else had ever done
                that.&rdquo;
              </p>
              <footer className="mt-3 text-sm font-medium text-gray-500">
                — Dave T., HVAC
              </footer>
            </blockquote>
          </div>
        </div>
      </section>

      {/* Objection handling */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="text-center text-2xl font-bold text-gray-900 sm:text-3xl">
            Common questions
          </h2>

          <div className="mt-12 space-y-8">
            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Will it look professional?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Yes. Your logo, your company name, your pricing — formatted like
                a proper proposal, not a spreadsheet screenshot.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                Do I need to be technical?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                No. If you can describe a job to a customer, you can use
                Quotli.
              </p>
            </div>

            <div>
              <h3 className="text-base font-semibold text-gray-900">
                What if the numbers are wrong?
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                You review every quote before sending. Change anything you want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-indigo-600 py-16">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Try it free for 14 days.
          </h2>
          <p className="mt-3 text-base text-indigo-100">
            If it doesn&apos;t save you 5 hours in your first week, cancel and
            pay nothing.
          </p>
          <div className="mt-8">
            <Link
              href="/sign-up"
              className="inline-block rounded-lg bg-white px-8 py-3.5 text-base font-semibold text-indigo-600 shadow-lg hover:bg-indigo-50"
            >
              Get started free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-gray-500">
          &copy; {new Date().getFullYear()} Quotli. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
