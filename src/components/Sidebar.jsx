import React from 'react';
import { Home, List, PlusCircle, DollarSign, Settings, Wallet, LogOut } from 'lucide-react';

const navItems = [
    { name: 'Kontrol Paneli', icon: Home, component: 'DASHBOARD' },
    { name: 'Daireler', icon: List, component: 'APARTMENT_LIST' },
    { name: 'Daire Ekle', icon: PlusCircle, component: 'APARTMENT_FORM' },
    { name: 'Aidat Tahakkuk', icon: DollarSign, component: 'DUES_MANAGEMENT' },
    { name: 'Bütçe & Harcama', icon: Wallet, component: 'BUDGET_TRACKER' },
    { name: 'Ayarlar', icon: Settings, component: 'SETTINGS' },
];

const Sidebar = ({ activeComponent, setActiveComponent, siteName, isSidebarOpen, toggleSidebar, currentUser, handleLogout }) => {
    
    if (!currentUser || currentUser.isAnonymous) {
        return null;
    }

    return (
        <div className={`
            flex flex-col h-full bg-gray-800 text-white w-64 fixed top-0 left-0 z-30 transition-transform duration-300
            ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
            lg:translate-x-0 lg:shadow-none 
        `}>
            
            <div className="p-4 border-b border-gray-700 flex justify-between items-center">
                <div>
                    <h1 className="text-xl font-bold text-indigo-400 truncate">
                        {siteName || 'Yönetim Sistemi'}
                    </h1>
                    <p className="text-xs text-gray-400 mt-1">Aidat Yönetim</p>
                </div>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <button
                        key={item.component}
                        onClick={() => {
                            setActiveComponent(item.component);
                            if (isSidebarOpen) toggleSidebar(); 
                        }}
                        className={`
                            flex items-center w-full p-3 rounded-lg transition duration-200
                            ${activeComponent === item.component
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                            }
                        `}
                    >
                        <item.icon className="w-5 h-5 mr-3" />
                        <span className="font-medium text-sm text-left">{item.name}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-700 space-y-3">
                {currentUser && currentUser.email && (
                    <p className="text-xs text-indigo-400 truncate mb-2">
                        Giriş: {currentUser.email}
                    </p>
                )}
                <button
                    onClick={handleLogout}
                    className="flex items-center w-full p-3 rounded-lg transition duration-200 bg-red-600 text-white hover:bg-red-700 shadow-md"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium text-sm text-left">Çıkış Yap</span>
                </button>
            </div>
        </div>
    );
};
export default Sidebar;
