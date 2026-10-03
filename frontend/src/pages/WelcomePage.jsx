import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Logo from "./Logo";

function Welcome() {
  const navigate = useNavigate();
  const [revealed, setRevealed] = useState(false);
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  useEffect(() => {
    requestAnimationFrame(() => setRevealed(true));
  }, []);

  return (
    <div className="min-h-screen bg-[#F6F8F2] text-[#0E241B]">
      {/* brand accent rule: bottle green / lime, matches Dashboard */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-[#0F3D2E]" />
        <div className="flex-1 bg-[#C6F135]" />
      </div>

      <header className="flex items-center justify-between px-6 py-6 sm:px-10">
        <Logo size={30} tone="dark" />
        <nav className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="cursor-pointer rounded-full border border-[#0E241B]/20 px-4 py-1.5 text-sm text-[#0E241B]/80 transition-colors hover:border-[#0F3D2E] hover:text-[#0F3D2E]"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => navigate("/register")}
            className="cursor-pointer rounded-full bg-[#0F3D2E] px-4 py-1.5 text-sm font-medium text-[#F6F8F2] transition-colors hover:bg-[#0C331F]"
          >
            Create account
          </button>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-16 text-center sm:px-10">
        <p
          className={`font-['IBM_Plex_Mono'] text-sm text-[#0E241B]/60 transition-all duration-700 ease-out ${
            revealed ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          for students who want to actually know where it went
        </p>

        <h1
          className={`mt-4 font-['Fraunces'] text-4xl font-medium leading-tight transition-all duration-700 ease-out sm:text-5xl ${
            revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          style={{ transitionDelay: "80ms" }}
        >
          Every rupee, ruled and recorded.
        </h1>

        <p
          className={`mx-auto mt-5 max-w-xl text-base text-[#0E241B]/70 transition-all duration-700 ease-out ${
            revealed ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
          }`}
          style={{ transitionDelay: "150ms" }}
        >
          Track pocket money, set savings goals, and see exactly where your
          spending goes — built for students, not accountants.
        </p>

        
      </main>
    </div>
  );
}

function Feature({ tone, title, body }) {
  const toneMap = {
    green: "bg-[#0F3D2E]",
    brick: "bg-[#B94A3B]",
    gold: "bg-[#D69A3C]",
  };
  return (
    <div>
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${toneMap[tone]}`} />
      <h3 className="mt-3 font-['Fraunces'] text-lg font-medium">{title}</h3>
      <p className="mt-1 text-sm text-[#0E241B]/65">{body}</p>
    </div>
  );
}

export default Welcome;