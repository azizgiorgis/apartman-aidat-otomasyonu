import React, { useState, useEffect } from 'react';
import BudgetTracker from './BudgetTracker';
import Settings from './Settings';
import DuesManagement from './DuesManagement';
import CurrencyDisplay from './CurrencyDisplay';
import { BarChart, Users, DollarSign, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const SummaryCard = ({ icon: Icon, title, value, unit = '', color }) => (
    <div className={`p-6 rounded-xl shadow-lg bg-white border-l-4 ${color}`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <p className="text-3xl font-extrabold text-gray-900 mt-1">
                    {value.toLocaleString('tr-TR')} {unit}
                </p>
            </div>
            <Icon className="w-8 h-8 text-gray-400 opacity-50" />
        </div>
    </div>
);

const Dashboard = ({ usdToTryRate, setUsdToTryRate, setSiteName, userId, showNotification, showConfirmation }) => {
    const [apartmentCount, setApartmentCount] = useState(0);
    const [totalDebtUSD, setTotalDebtUSD] = useState(0);
    const [overdueDuesCount, setOverdueDuesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            console.log('UserId yok, listener kurulamıyor');
            setLoading(false);
            return;
        }

        console.log('Dashboard listener kurulacak. UserId:', userId);

        try {
            // ✅ DOĞRU YÖNTEM: Separate arguments
            const apartmentsRef = collection(db, 'users', userId, 'apartments');
            console.log('Collection path:', apartmentsRef.path);

            const unsubscribeApartments = onSnapshot(
                apartmentsRef,
                (querySnapshot) => {
                    console.log('Snapshot alındı, doc count:', querySnapshot.size);
                    
                    let debtSumUSD = 0;
                    let apartmentsWithDebt = 0;

                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        const debt = data.currentDebtUSD || 0;
                        debtSumUSD += debt;
                        if (debt > 0) {
                            apartmentsWithDebt++;
                        }
                    });

                    setApartmentCount(querySnapshot.size);
                    setTotalDebtUSD(debtSumUSD);
                    setOverdueDuesCount(apartmentsWithDebt);
                    setLoading(false);
                },
                (error) => {
                    console.error("Dashboard Firestore hatası:", error);
                    console.error("Error code:", error.code);
                    console.error("Error message:", error.message);
                    setLoading(false);
                }
            );

            return () => {
                console.log('Dashboard listener temizleniyor');
                unsubscribeApartments();
            };
        } catch (error) {
            console.error('Collection referansı oluşturulurken hata:', error);
            setLoading(false);
        }
    }, [userId]);

    const totalDebtTRY = totalDebtUSD * (usdToTryRate || 1);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-lg font-medium text-gray-700">Dashboard yükleniyor...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-extrabold text-gray-900 border-b pb-2">Genel Bakış</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <SummaryCard
                    icon={Users}
                    title="Toplam Daire"
                    value={apartmentCount}
                    unit="Adet"
                    color="border-indigo-500"
                />
                <SummaryCard
                    icon={DollarSign}
                    title="Toplam Borç (₺)"
                    value={totalDebtTRY.toFixed(2)}
                    unit="₺"
                    color="border-red-500"
                />
                <SummaryCard
                    icon={BarChart}
                    title="Toplam Borç (Dolar)"
                    value={totalDebtUSD.toFixed(2)}
                    unit="$"
                    color="border-green-500"
                />
                <SummaryCard
                    icon={AlertTriangle}
                    title="Borçlu Daire Sayısı"
                    value={overdueDuesCount}
                    unit="Daire"
                    color="border-yellow-500"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <BudgetTracker
                        userId={userId}
                        usdToTryRate={usdToTryRate}
                        showNotification={showNotification}
                    />
                </div>
                <div className="lg:col-span-1 space-y-6">
                    <div className="p-6 bg-white rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Döviz Kuru</h3>
                        <CurrencyDisplay setUsdToTryRate={setUsdToTryRate} />
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Hızlı Tahakkuk</h3>
                        <DuesManagement
                            userId={userId}
                            usdToTryRate={usdToTryRate}
                            isCompact={true}
                            showNotification={showNotification}
                            showConfirmation={showConfirmation}
                        />
                    </div>
                    <div className="p-6 bg-white rounded-xl shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">Site Ayarları</h3>
                        <Settings userId={userId} setSiteName={setSiteName} showNotification={showNotification} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;