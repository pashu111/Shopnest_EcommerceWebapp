import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-10">
      {/* Top Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8">
        
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-1">
          <h2 className="text-xl font-bold text-white">ShopNest</h2>
          <p className="mt-3 text-sm">
            Your one-stop shop for groceries, fresh produce, and daily essentials.
          </p>
        </div>

        {/* Categories */}
        <div>
          <h3 className="text-white font-semibold mb-3">Categories</h3>
          <ul className="space-y-2 text-sm">
            <li>Fruits & Vegetables</li>
            <li>Groceries</li>
            <li>Dairy & Bakery</li>
            <li>Snacks & Beverages</li>
            <li>Personal Care</li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h3 className="text-white font-semibold mb-3">Customer Care</h3>
          <ul className="space-y-2 text-sm">
            <li>Help Center</li>
            <li>Returns & Refunds</li>
            <li>Shipping Policy</li>
            <li>Terms & Conditions</li>
            <li>Privacy Policy</li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h3 className="text-white font-semibold mb-3">Contact Us</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2 break-all">
              <Phone size={16} /> +91 98765 43210
            </li>
            <li className="flex items-start gap-2 break-all">
              <Mail size={16} /> support@shopnest.com
            </li>
            <li className="flex items-start gap-2">
              <MapPin size={16} /> Bhubaneswar, India
            </li>
          </ul>
        </div>

        {/* Social */}
        <div>
          <h3 className="text-white font-semibold mb-3">Follow Us</h3>
          <div className="flex gap-4">
            <Facebook className="hover:text-white cursor-pointer" />
            <Instagram className="hover:text-white cursor-pointer" />
            <Twitter className="hover:text-white cursor-pointer" />
            <Linkedin className="hover:text-white cursor-pointer" />
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="border-t border-gray-700 py-4 text-center text-sm">
        © {new Date().getFullYear()} ShopNest. All rights reserved.
      </div>
    </footer>
  );
}
