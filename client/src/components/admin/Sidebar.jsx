import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../../redux/slices/authSlice';
import { LayoutDashboard, Package, LogOut, Menu, X, ClipboardList, Truck } from 'lucide-react';
// Import your logo from assets
import logo from '../../assets/ShopNest.png'; 

const Sidebar = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  
  // State to handle mobile menu toggle
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const menuItems = [
    { name: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin/dashboard' },
    { name: 'Products', icon: <Package size={20} />, path: '/admin/products' },
    { name: 'Order Details', icon: <ClipboardList size={20} />, path: '/admin/orders' },
    { name: 'Delivery Partners', icon: <Truck size={20} />, path: '/admin/delivery-partners' },
  ];

  const toggleSidebar = () => setIsOpen(!isOpen);

  return (
    <>
      {/* --- MOBILE TOP BAR --- */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex justify-between items-center fixed top-0 w-full z-50">
        <div className="flex items-center gap-2 min-w-0">
          <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold italic truncate">ShopNest</span>
        </div>
        <button onClick={toggleSidebar} className="p-2 hover:bg-slate-800 rounded-lg">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* --- SIDEBAR OVERLAY (Mobile only) --- */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={toggleSidebar}
        />
      )}

      {/* --- SIDEBAR CONTAINER --- */}
      <div className={`
        fixed left-0 top-0 h-screen bg-slate-900 text-white flex flex-col z-50
        transition-transform duration-300 ease-in-out
        w-64 lg:translate-x-0 
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        {/* Sidebar Header */}
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <img src={logo} alt="Logo" className="w-10 h-10 object-contain rounded-lg bg-white/10 p-1" />
          <span className="text-xl font-bold italic">ShopNest</span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 mt-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => setIsOpen(false)} // Close sidebar on mobile after clicking
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                location.pathname === item.path ? 'bg-red-600 shadow-lg shadow-red-900/20' : 'hover:bg-slate-800 text-gray-400 hover:text-white'
              }`}
            >
              {item.icon} <span className="font-medium">{item.name}</span>
            </Link>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-3 w-full px-4 py-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
          >
            <LogOut size={20} /> <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
