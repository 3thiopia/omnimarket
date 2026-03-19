import { Search, MapPin, User, PlusCircle, Menu } from 'lucide-react';

export const Navbar = () => {
  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-4">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">O</span>
            </div>
            <span className="text-2xl font-bold tracking-tight text-gray-900 hidden sm:block">
              Omni<span className="text-emerald-500">Market</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl hidden md:flex items-center bg-gray-100 rounded-full px-4 py-2 gap-2 border border-transparent focus-within:border-emerald-500 focus-within:bg-white transition-all">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="I am looking for..."
              className="bg-transparent border-none focus:ring-0 w-full text-sm outline-none"
            />
            <div className="h-4 w-[1px] bg-gray-300 mx-2" />
            <div className="flex items-center gap-1 text-gray-500 text-sm whitespace-nowrap cursor-pointer hover:text-emerald-500">
              <MapPin className="w-4 h-4" />
              <span>All Regions</span>
            </div>
            <button className="bg-emerald-500 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-600 transition-colors">
              Search
            </button>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button className="text-gray-600 hover:text-emerald-500 transition-colors hidden sm:flex items-center gap-1 font-medium">
              <User className="w-5 h-5" />
              <span>Sign In</span>
            </button>
            <button className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95">
              <PlusCircle className="w-5 h-5" />
              <span>SELL</span>
            </button>
            <button className="md:hidden text-gray-600">
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
