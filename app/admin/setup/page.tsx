import BrandMark from "@/components/BrandMark";
import SetupForm from "./SetupForm";

export const metadata = { title: "Set up admin — Makeup by Anastasia Laj" };

export default function SetupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <BrandMark size="sm" href={null} />
          <h1 className="mt-4 text-2xl text-ink">Welcome — let&apos;s secure your admin</h1>
          <p className="mt-2 text-sm text-ink-soft">
            Set a password and connect an authenticator app for two-factor login.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
