import BrandMark from "@/components/BrandMark";
import LoginForm from "./LoginForm";

export const metadata = { title: "Artist login — Makeup by Anastasia Laj" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <BrandMark size="sm" href={null} />
          <h1 className="mt-4 text-2xl text-ink">Artist login</h1>
          <p className="mt-1 text-sm text-ink-soft">Welcome back, Anastasia.</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
