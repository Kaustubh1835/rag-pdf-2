"use client";

import { usePathname } from "next/navigation";

export default function FooterWrapper() {
  const pathname = usePathname();
  
  // Hide footer on chat pages
  if (pathname?.includes("/chat")) {
    return null;
  }

  return (
    <footer className="shrink-0 px-4 sm:px-8 py-8 md:py-10 bg-white/50 backdrop-blur-md border-t border-sky-500/20">
      <div className="max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10">
        <div>
          <h3 className="text-[#0c4a6e] font-extrabold text-lg mb-3 tracking-tight">InsightPDF</h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-[300px]">
            Revolutionizing how you interact with documents. Our AI-powered platform makes information extraction effortless.
          </p>
        </div>
        <div>
          <h4 className="text-[#0c4a6e] font-bold text-xs uppercase tracking-wider mb-3">Product</h4>
          <ul className="list-none p-0 m-0 space-y-2">
            <li><a href="#" className="text-slate-600 hover:text-sky-600 text-xs sm:text-sm transition-colors">Features</a></li>
            <li><a href="#" className="text-slate-600 hover:text-sky-600 text-xs sm:text-sm transition-colors">Pricing</a></li>
          </ul>
        </div>
        <div>
          <h4 className="text-[#0c4a6e] font-bold text-xs uppercase tracking-wider mb-3">Company</h4>
          <ul className="list-none p-0 m-0 space-y-2">
            <li><a href="#" className="text-slate-600 hover:text-sky-600 text-xs sm:text-sm transition-colors">About</a></li>
            <li><a href="#" className="text-slate-600 hover:text-sky-600 text-xs sm:text-sm transition-colors">Privacy</a></li>
          </ul>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto mt-6 pt-5 border-t border-sky-500/10 flex flex-col sm:flex-row justify-between items-center gap-2">
        <p className="text-slate-400 text-xs text-center sm:text-left">
          &copy; {new Date().getFullYear()} InsightPDF Inc. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
