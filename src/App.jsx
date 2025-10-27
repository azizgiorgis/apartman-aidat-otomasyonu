import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { auth, db, getCollectionPath } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import View from './components/View';

import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import ApartmentList from './components/ApartmentList';
import ApartmentForm from './components/ApartmentForm';
import DuesManagement from './components/DuesManagement';
import BudgetTracker from './components/BudgetTracker';
import Settings from './components/Settings';
import Auth from './components/Auth';

import { Loader2, Menu, X, Settings as SettingsIcon, Home, List, PlusCircle, DollarSign, Wallet } from 'lucide-react';

const NotificationModal = ({ message, type, isVisible, onClose, onConfirm }) => {
    if (!isVisible) return null;

    const baseClass = "fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50";
    const modalClass = "bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full transform transition-all scale-100";
    const titleClass = type === 'error' ? 'text-red-600' : 'text-indigo-600';

    return (
        <div className={baseClass}>
            <div className={modalClass}>
                <h3 className={`text-lg font-bold mb-4 ${titleClass}`}>
                    {type === 'confirm' ? 'Onay Gerekiyor' : type === 'error' ? 'Hata' : 'Bilgi'}
                </h3>
                <p className="text-gray-700 whitespace-pre-line mb-6">{message}</p>

                <div className="flex justify-end space-x-3">
                    {type === 'confirm' && (
                        <button
                            onClick={() => { onConfirm(true); onClose(); }}
                            className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition"
                        >
                            Evet, Onayla
                        </button>
                    )}
                    <button
                        onClick={() => { type === 'confirm' ? onConfirm(false) : onClose(); }}
                        className={`px-4 py-2 font-medium rounded-lg ${type === 'confirm' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {type === 'confirm' ? 'İptal' : 'Kapat'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const navItems = [
    { name: 'Aidat Kontrol Paneli', icon: Home, component: 'DASHBOARD' },
    { name: 'Daireler', icon: List, component: 'APARTMENT_LIST' },
    { name: 'Daire Ekle', icon: PlusCircle, component: 'APARTMENT_FORM' },
    { name: 'Aidat Tahakkuk', icon: DollarSign, component: 'DUES_MANAGEMENT' },
    { name: 'Bütçe & Harcama', icon: Wallet, component: 'BUDGET_TRACKER' },
    { name: 'Ayarlar', icon: SettingsIcon, component: 'SETTINGS' },
];

function MainApp({
    currentUser,
    usdToTryRate,
    setUsdToTryRate,
    siteName,
    setSiteName,
    showNotification,
    showConfirmation
}) {
    const [activeComponent, setActiveComponent] = useState('DASHBOARD');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    useEffect(() => {
        setIsSidebarOpen(false);
    }, [location]);

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Çıkış yaparken hata:", error);
            showNotification('Çıkış yaparken bir hata oluştu: ' + error.message, 'error');
        }
    };

    const renderContent = () => {
        const props = {
            userId: currentUser.uid,
            usdToTryRate: usdToTryRate,
            setUsdToTryRate: setUsdToTryRate,
            setSiteName: setSiteName,
            showNotification: showNotification,
            showConfirmation: showConfirmation
        };

        switch (activeComponent) {
            case 'DASHBOARD':
                return <Dashboard {...props} />;
            case 'APARTMENT_LIST':
                return <ApartmentList {...props} />;
            case 'APARTMENT_FORM':
                return <ApartmentForm {...props} />;
            case 'DUES_MANAGEMENT':
                return <DuesManagement {...props} />;
            case 'BUDGET_TRACKER':
                return <BudgetTracker {...props} />;
            case 'SETTINGS':
                return <Settings {...props} />;
            default:
                return <Dashboard {...props} />;
        }
    };
    return (
        <div className="min-h-screen bg-gray-100 antialiased font-sans flex">

            <Sidebar
                activeComponent={activeComponent}
                setActiveComponent={setActiveComponent}
                siteName={siteName}
                isSidebarOpen={isSidebarOpen}
                toggleSidebar={toggleSidebar}
                currentUser={currentUser}
                handleLogout={handleLogout}
            />

            <div className="flex-1 lg:ml-64 transition-all duration-300">
                <header className="sticky top-0 z-20 bg-white shadow-md p-4 flex justify-between items-center space-x-4">
                    <button
                        onClick={toggleSidebar}
                        className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100 transition"
                    >
                        {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                    </button>

                    <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 truncate">
                        {navItems.find(item => item.component === activeComponent)?.name || 'Aidat Kontrol Paneli'}
                    </h2>
                </header>
                <main className="p-4 sm:p-8">
                    {renderContent()}
                </main>

                <footer className="mt-10 text-center text-gray-500 text-sm p-4">
                    Giriş yapan kullanıcı: {currentUser.email}
                </footer>
            </div>
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black opacity-50 z-20 lg:hidden"
                    onClick={toggleSidebar}
                ></div>
            )}
        </div>
    );
}

export default function App() {
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const [usdToTryRate, setUsdToTryRate] = useState(null);
    const [siteName, setSiteName] = useState('Yönetim Sistemi');

    const [modal, setModal] = useState({
        isVisible: false,
        message: '',
        type: 'info',
        resolve: null
    });

    const showNotification = useCallback((message, type = 'info') => {
        setModal({
            isVisible: true,
            message: message,
            type: type,
            resolve: null
        });
    }, []);

    const showConfirmation = useCallback((message) => {
        return new Promise((resolve) => {
            setModal({
                isVisible: true,
                message: message,
                type: 'confirm',
                resolve: resolve
            });
        });
    }, []);

    const closeModal = () => {
        setModal(prev => ({ ...prev, isVisible: false, resolve: null }));
    };

    const handleConfirm = (result) => {
        if (modal.resolve) {
            modal.resolve(result);
        }
        closeModal();
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setCurrentUser(user);
            } else {
                setCurrentUser(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (currentUser && db) {
            const settingsPath = getCollectionPath(currentUser.uid, "settings");
            const settingsDocRef = doc(db, settingsPath, 'config');

            const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    setSiteName(docSnap.data().siteName || 'Yönetim Sistemi');
                } else {
                    setSiteName('Yönetim Sistemi');
                }
            });
            return () => unsubscribe();
        }
    }, [currentUser, db]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route path="/daire/:userId/:apartmentId" element={<View />} />
                <Route
                    path="/*"
                    element={
                        currentUser ? (
                            <MainApp
                                currentUser={currentUser}
                                usdToTryRate={usdToTryRate}
                                setUsdToTryRate={setUsdToTryRate} 
                                siteName={siteName}
                                setSiteName={setSiteName}
                                showNotification={showNotification}
                                showConfirmation={showConfirmation}
                            />
                        ) : (
                            <Auth />
                        )
                    }
                />
            </Routes>

            <NotificationModal
                isVisible={modal.isVisible}
                message={modal.message}
                type={modal.type}
                onClose={closeModal}
                onConfirm={handleConfirm}
            />
        </Router>
    );
}