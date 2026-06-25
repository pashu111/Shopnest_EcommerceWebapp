import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = {
  categories: [
    { label: "Fruits & Vegetables", to: "/home" },
    { label: "Groceries", to: "/home" },
    { label: "Dairy & Bakery", to: "/home" },
    { label: "Snacks & Beverages", to: "/home" },
    { label: "Personal Care", to: "/home" },
  ],
  support: [
    { label: "Help Center", to: "/home" },
    { label: "Returns & Refunds", to: "/home" },
    { label: "Shipping Policy", to: "/home" },
    { label: "Terms & Conditions", to: "/home" },
    { label: "Privacy Policy", to: "/home" },
  ],
};

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h2 className="text-2xl font-extrabold text-white tracking-tight">
              ShopNest
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Your one-stop shop for fresh groceries, premium produce, and daily
              essentials — delivered with care.
            </p>
            <div className="mt-5 flex gap-3">
              {[
                { icon: Facebook, href: "#" },
                { icon: Instagram, href: "#" },
                { icon: Twitter, href: "#" },
                { icon: Linkedin, href: "#" },
              ].map(({ icon: Icon, href }) => (
                <a
                  key={href}
                  href={href}
                  className="w-9 h-9 rounded-lg bg-slate-800 hover:bg-emerald-700 flex items-center justify-center text-slate-400 hover:text-white transition-all"
                >
                  <Icon size={16} />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Categories
            </h3>
            <ul className="space-y-3">
              {footerLinks.categories.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="inline-flex items-center gap-1.5 text-sm hover:text-emerald-400 transition-colors"
                  >
                    <ChevronRight size={12} className="text-emerald-500" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              {footerLinks.support.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    className="inline-flex items-center gap-1.5 text-sm hover:text-emerald-400 transition-colors"
                  >
                    <ChevronRight size={12} className="text-emerald-500" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Contact Us
            </h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Phone size={15} className="mt-0.5 text-emerald-400 shrink-0" />
                <span>+91 98765 43210</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={15} className="mt-0.5 text-emerald-400 shrink-0" />
                <span>support@shopnest.com</span>
              </li>
              <li className="flex items-start gap-3">
                <MapPin size={15} className="mt-0.5 text-emerald-400 shrink-0" />
                <span>Bhubaneswar, Odisha, India</span>
              </li>
            </ul>
          </div>

          {/* App / Download */}
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4">
              Download
            </h3>
            <p className="text-sm leading-relaxed mb-3">
              Get the ShopNest app for faster ordering and exclusive deals.
            </p>
            <div className="flex flex-col gap-2">
              <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                App Store
              </span>
              <span className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.807 1.626a1 1 0 0 1 0 1.732l-2.807 1.626L15.206 12l2.492-2.492zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/></svg>
                Google Play
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>&copy; {new Date().getFullYear()} ShopNest. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Made with <span className="text-rose-500">&hearts;</span> in India
          </p>
        </div>
      </div>
    </footer>
  );
}
