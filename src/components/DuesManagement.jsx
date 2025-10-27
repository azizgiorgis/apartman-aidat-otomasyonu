import React, { useState } from 'react';
import { db, getCollectionPath } from '../firebase'; 
import { collection, getDocs, writeBatch, query, where, doc, getDoc } from 'firebase/firestore';
import { DollarSign, AlertCircle, XCircle, Loader2 } from 'lucide-react';

const DuesManagement = ({ usdToTryRate, userId, isCompact = false, showNotification, showConfirmation }) => {
    const [amount, setAmount] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(false);

    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık\n"];

    const handleDuesAccrual = async (e) => {
        e.preventDefault();
        
        const dueAmountTRY = parseFloat(amount);

        if (isNaN(dueAmountTRY) || dueAmountTRY <= 0) {
            showNotification("Geçerli bir aidat miktarı giriniz.", "error");
            return;
        }

        if (!usdToTryRate) {
            showNotification("Döviz kuru bilgisi yüklenmeden işlem yapılamaz.", "error");
            return;
        }
        
        if (!userId) {
            console.error("Kullanıcı kimliği (userId) mevcut değil.");
            showNotification("Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.", "error");
            return;
        }

        setLoading(true);

        const apartmentsPath = getCollectionPath(userId, "apartments");
        const duesPath = getCollectionPath(userId, "dues");
        const budgetPath = getCollectionPath(userId, "budget");
        const BUDGET_DOC_ID = 'main_budget';

        try {
            const dueAmountUSD = dueAmountTRY / usdToTryRate;
            const apartmentsQuery = collection(db, apartmentsPath);
            const apartmentSnapshots = await getDocs(apartmentsQuery);
            const apartments = apartmentSnapshots.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (apartments.length === 0) {
                showNotification("Sistemde kayıtlı daire bulunmamaktadır. Lütfen önce daire ekleyin.", "error");
                setLoading(false);
                return;
            }
            const existingDuesQuery = query(
                collection(db, duesPath),
                where("month", "==", month),
                where("year", "==", year)
            );
            const existingDuesSnapshots = await getDocs(existingDuesQuery);
            if (!existingDuesSnapshots.empty) {
                const isConfirmed = await showConfirmation(`${monthNames[month - 1]} ayı için zaten aidat tahakkuk ettirilmiş. Tekrar borçlandırmak istediğinizden emin misiniz?`);
                if (!isConfirmed) {
                    setLoading(false);
                    return;
                }
            }
            const batch = writeBatch(db);

            apartments.forEach(apt => {
                const newDueRef = doc(collection(db, duesPath)); 
                batch.set(newDueRef, {
                    apartmentId: apt.id,
                    amountUSD: dueAmountUSD,
                    month: month,
                    year: year,
                    accrualDate: new Date(),
                    rate: usdToTryRate, 
                });

                const aptRef = doc(db, apartmentsPath, apt.id);
                const newDebtUSD = (apt.currentDebtUSD || 0) + dueAmountUSD;
                batch.update(aptRef, {
                    currentDebtUSD: newDebtUSD,
                    lastAccrual: new Date(),
                });
            });
            
            await batch.commit();

            showNotification(`${monthNames[month - 1]} ayı için ${apartments.length} daire başarıyla borçlandırıldı.`, "success");
            setAmount('');
        } catch (error) {
            console.error("Aidat tahakkuk ettirilirken hata oluştu:", error);
            showNotification('Aidat tahakkukunda bir hata oluştu. Konsolu kontrol edin.', "error");
        } finally {
            setLoading(false);
        }
    };
    
    const containerClasses = isCompact 
        ? "space-y-4" 
        : "bg-white p-6 rounded-xl shadow-lg h-full space-y-4";
    const titleClasses = isCompact 
        ? "hidden"
        : "text-2xl font-extrabold text-gray-900 mb-4 border-b pb-2 flex items-center";

    const isButtonDisabled = loading || !usdToTryRate || amount <= 0;
    
    const yearOptions = [];
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
        yearOptions.push(currentYear + i);
    }


    return (
        <div className={containerClasses}>
            <h2 className={titleClasses}>
                <DollarSign className="w-6 h-6 mr-2 text-red-600" /> Aidat Tahakkuk İşlemleri
            </h2>
            
            {!usdToTryRate && (
                <div className="p-3 text-sm text-yellow-700 bg-yellow-100 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2" /> Döviz kuru yüklenmedi. Tahakkuk yapılamaz.
                </div>
            )}
            
            <form onSubmit={handleDuesAccrual} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="month" className="block text-sm font-medium text-gray-700">Ay</label>
                        <select
                            id="month"
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                            {monthNames.map((name, index) => (
                                <option key={index + 1} value={index + 1}>
                                    {name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="year" className="block text-sm font-medium text-gray-700">Yıl</label>
                        <select
                            id="year"
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        >
                            {yearOptions.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Aylık Aidat Miktarı (₺)</label>
                    <input
                        type="number"
                        id="amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                        min="1"
                        step="any"
                        placeholder="Örn: 1000.50"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isButtonDisabled}
                    className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${isButtonDisabled ? 'bg-gray-400' : 'bg-red-600 hover:bg-red-700'} flex items-center justify-center`}
                >
                    {loading ? (
                        <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Borçlandırılıyor...</span>
                    ) : (
                        `${monthNames[month - 1]} Ayı Aidatını Tahakkuk Ettir`
                    )}
                </button>
            </form>
        </div>
    );
};

export default DuesManagement;