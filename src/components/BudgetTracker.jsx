import React, { useState, useEffect } from 'react';
import { db, getCollectionPath } from '../firebase';
import { doc, updateDoc, collection, addDoc, query, orderBy, limit, increment, getDocs, getDoc } from 'firebase/firestore';
import { DollarSign, MinusCircle, PlusCircle, AlertCircle, Calendar, Save, Loader2, DollarSign as DollarIcon, ChevronLeft, ChevronRight, List, ShoppingCart, Home } from 'lucide-react';

const EXPENSE_CATEGORIES = [
    { value: 'ELEKTRIK_SU_GAZ', label: 'Elektrik/Su/Doğalgaz', type: 'EXPENSE', icon: <ShoppingCart className="w-4 h-4 mr-2" /> },
    { value: 'TEMIZLIK_PERSONEL', label: 'Temizlik/Personel', type: 'EXPENSE', icon: <Home className="w-4 h-4 mr-2" /> },
    { value: 'BAKIM_ONARIM', label: 'Asansör/Tesisat Bakımı', type: 'EXPENSE', icon: <List className="w-4 h-4 mr-2" /> },
    { value: 'VERGI_DEVLET', label: 'Vergi/Devlet Ödemesi', type: 'EXPENSE', icon: <DollarIcon className="w-4 h-4 mr-2" /> },
    { value: 'DIGER_GIDER', label: 'Diğer Giderler', type: 'EXPENSE', icon: <AlertCircle className="w-4 h-4 mr-2" /> },
];

const INCOME_CATEGORIES = [
    { value: 'AIDAT_GELIRI', label: 'Aidat Gelirleri', type: 'INCOME', icon: <PlusCircle className="w-4 h-4 mr-2" /> },
    { value: 'KIRA_GELIRI', label: 'Kira Gelirleri (Ortak Alan)', type: 'INCOME', icon: <DollarIcon className="w-4 h-4 mr-2" /> },
    { value: 'DIGER_GELIR', label: 'Diğer Gelirler', type: 'INCOME', icon: <PlusCircle className="w-4 h-4 mr-2" /> },
];

const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

const BUDGET_DOC_ID = 'main_budget';

const BudgetTracker = ({ usdToTryRate, userId, showNotification }) => {
    const [balance, setBalance] = useState(0);
    const [expenditures, setExpenditures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expendituresLoading, setExpendituresLoading] = useState(true);

    const [expAmount, setExpAmount] = useState('');
    const [description, setDescription] = useState('');
    const [expLoading, setExpLoading] = useState(false);

    const [isIncome, setIsIncome] = useState(false); // false: Gider, true: Gelir
    const [category, setCategory] = useState('');

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [totalItems, setTotalItems] = useState(0);

    const budgetPath = userId ? getCollectionPath(userId, "budget") : null;
    const expendituresPath = userId ? getCollectionPath(userId, "expenditures") : null;
    const budgetRef = budgetPath ? doc(db, budgetPath, BUDGET_DOC_ID) : null;


    // **********************************************
    // Bütçe çekme (Balance) -
    // **********************************************
    useEffect(() => {
        if (!userId || !budgetPath) return;

        let isMounted = true;
        const fetchBudget = async () => {
            try {
                // Sadece tek bir dokümanı çekmek daha performanslıdır
                const budgetDocRef = doc(db, budgetPath, BUDGET_DOC_ID);
                const docSnap = await getDoc(budgetDocRef);

                if (!isMounted) return;

                let balanceUSD = 0;
                if (docSnap.exists()) {
                    balanceUSD = docSnap.data().balanceUSD || 0;
                }

                setBalance(balanceUSD);
                setLoading(false);
            } catch (error) {
                console.error("Bütçe çekilirken hata:", error);
                setLoading(false);
            }
        };

        const pollInterval = setInterval(fetchBudget, 5000);
        fetchBudget();

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [userId, budgetPath]);

    // **********************************************
    // Harcama Listesini Çekme 
    // **********************************************
    useEffect(() => {
        if (!userId || !expendituresPath) return;

        let isMounted = true;
        const fetchExpenditures = async () => {
            try {
                const expendituresQuery = query(
                    collection(db, expendituresPath),
                    orderBy('date', 'desc')
                );

                const snapshot = await getDocs(expendituresQuery);

                if (!isMounted) return;

                const expList = [];
                snapshot.forEach(doc => {
                    const dateField = doc.data().date || doc.data().createdAt;
                    expList.push({ id: doc.id, ...doc.data(), date: dateField });
                });

                setExpenditures(expList);
                setTotalItems(expList.length);
                setExpendituresLoading(false);
            } catch (error) {
                console.error("Harcamalar çekilirken hata:", error);
                setExpendituresLoading(false);
            }
        };

        const pollInterval = setInterval(fetchExpenditures, 5000);
        fetchExpenditures();

        return () => {
            isMounted = false;
            clearInterval(pollInterval);
        };
    }, [userId, expendituresPath]);


    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentExpenditures = expenditures.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const nextPage = () => { if (currentPage < totalPages) { setCurrentPage(currentPage + 1); } };
    const prevPage = () => { if (currentPage > 1) { setCurrentPage(currentPage - 1); } };
    const goToPage = (pageNumber) => { setCurrentPage(pageNumber); };

    const getDisplayedPages = () => {
        const pageNumbers = [];
        for (let i = 1; i <= totalPages; i++) {
            pageNumbers.push(i);
        }
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage + 1 < maxPagesToShow) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        return pageNumbers.slice(startPage - 1, endPage);
    };

    const handleNewExpenditure = async (e) => {
        e.preventDefault();

        if (!category) {
            showNotification("Lütfen bir kategori seçiniz.", "error");
            return;
        }

        const amountTRY = parseFloat(expAmount);

        if (isNaN(amountTRY) || amountTRY <= 0) {
            showNotification(`Geçerli bir ${isIncome ? 'gelir' : 'harcama'} miktarı (₺) giriniz.`, "error");
            return;
        }

        if (!description.trim()) {
            showNotification("Lütfen açıklama giriniz.", "error");
            return;
        }

        if (!usdToTryRate || usdToTryRate <= 0) {
            showNotification("Döviz kuru bilgisi yüklenmeden işlem yapılamaz.", "error");
            return;
        }

        if (!budgetRef || !expendituresPath) return;

        const amountUSD = amountTRY / usdToTryRate;
        const finalAmountUSD = isIncome ? amountUSD : -amountUSD;

        if (!isIncome) {
            const newBalanceUSD = balance + finalAmountUSD;
            if (newBalanceUSD < 0) {
                const isConfirmed = confirm(
                    `Harcama miktarı (₺${amountTRY.toLocaleString('tr-TR')}) bütçeyi ${(-newBalanceUSD * usdToTryRate).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} kadar aşmaktadır. Onaylıyor musunuz?`
                );
                if (!isConfirmed) return;
            }
        }

        setExpLoading(true);

        try {
            await addDoc(collection(db, expendituresPath), {
                description: description.trim(),
                amountUSD: amountUSD,
                amountTRY: amountTRY,
                date: new Date(),
                createdAt: new Date(),
                rate: usdToTryRate,
                type: isIncome ? 'INCOME' : 'EXPENSE',
                category: category,
                finalAmountUSD: finalAmountUSD,
            });

            await updateDoc(budgetRef, {
                balanceUSD: increment(finalAmountUSD)
            });

            showNotification(`${isIncome ? 'Gelir' : 'Harcama'} (${amountTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}) başarıyla kaydedildi.`, "success");

            setExpAmount('');
            setDescription('');
            setCategory('');
            setCurrentPage(1);

        } catch (error) {
            console.error("İşlem eklenirken hata oluştu:", error);
            showNotification("İşlem eklenirken bir hata oluştu.", "error");
        } finally {
            setExpLoading(false);
        }
    };

    const currentBalanceTRY = balance * (usdToTryRate || 1);

    if (loading) {
        return <div className="p-6 bg-white rounded-xl shadow-lg text-center text-gray-500"><Loader2 className="w-5 h-5 inline mr-2 animate-spin" /> Bütçe yükleniyor...</div>;
    }

    const currentCategories = isIncome ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center">
                <DollarIcon className="w-6 h-6 mr-2 text-green-600" /> Site/Apartman Bütçesi
            </h2>

            <div className={`p-6 rounded-xl shadow-inner mb-6 ${currentBalanceTRY < 0 ? 'bg-red-100 border-l-4 border-red-500' : 'bg-green-100 border-l-4 border-green-500'}`}>
                <p className="text-lg font-medium text-gray-700">Güncel Bütçe Bakiyesi</p>
                <p className="text-4xl font-extrabold mt-1">
                    {currentBalanceTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                    ({balance.toFixed(2)} Dolar)
                </p>
            </div>

            <div className="mb-8 border p-4 rounded-lg bg-gray-50">
                <h3 className="text-xl font-semibold mb-4 text-gray-800 flex items-center">
                    {isIncome ? <PlusCircle className="w-5 h-5 mr-2 text-green-500" /> : <MinusCircle className="w-5 h-5 mr-2 text-red-500" />}
                    Yeni {isIncome ? 'Gelir' : 'Harcama'} Kaydı
                </h3>
                <form onSubmit={handleNewExpenditure} className="space-y-4">

                    <div className="flex space-x-4">
                        <button
                            type="button"
                            onClick={() => { setIsIncome(false); setCategory(''); }}
                            className={`w-1/2 py-2 rounded-md transition-colors font-medium ${!isIncome ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            <MinusCircle className="w-4 h-4 inline mr-2" /> Gider
                        </button>
                        <button
                            type="button"
                            onClick={() => { setIsIncome(true); setCategory(''); }}
                            className={`w-1/2 py-2 rounded-md transition-colors font-medium ${isIncome ? 'bg-green-600 text-white shadow-md' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                        >
                            <PlusCircle className="w-4 h-4 inline mr-2" /> Gelir
                        </button>
                    </div>

                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                            Kategori Seçin
                        </label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                        >
                            <option value="">-- Kategori Seçiniz --</option>
                            {currentCategories.map(cat => (
                                <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="expAmount" className="block text-sm font-medium text-gray-700">
                            Miktar (₺)
                        </label>
                        <input
                            type="number"
                            id="expAmount"
                            value={expAmount}
                            onChange={(e) => setExpAmount(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                            min="0.01"
                            step="any"
                            placeholder="Örn: 550.75"
                        />
                    </div>
                    <div>
                        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Açıklama ({isIncome ? 'Gelir' : 'Harcama'} nedeni)
                        </label>
                        <input
                            type="text"
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                            required
                            placeholder="Açıklama giriniz"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={expLoading || !usdToTryRate || !category}
                        className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center justify-center ${expLoading || !usdToTryRate || !category ? 'bg-gray-400' : (isIncome ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700')}`}
                    >
                        {expLoading ? (
                            <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</span>
                        ) : (
                            <span className="flex items-center"><Save className="w-4 h-4 mr-2" /> {isIncome ? 'Geliri Kaydet' : 'Harcamayı Kaydet'}</span>
                        )}
                    </button>
                </form>
            </div>

            <div className="border-t pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-800 flex items-center mb-2 sm:mb-0">
                        <List className="w-5 h-5 mr-2 text-blue-600" />
                        Tüm İşlemler
                    </h3>

                    <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                            Toplam {totalItems} kayıt
                        </span>

                        <select
                            value={itemsPerPage}
                            onChange={(e) => {
                                setItemsPerPage(Number(e.target.value));
                                setCurrentPage(1);
                            }}
                            className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                        >
                            <option value={5}>5 kayıt</option>
                            <option value={10}>10 kayıt</option>
                            <option value={20}>20 kayıt</option>
                            <option value={50}>50 kayıt</option>
                        </select>
                    </div>
                </div>

                {expendituresLoading ? (
                    <div className="text-center py-8 text-gray-500">
                        <Loader2 className="w-6 h-6 inline mr-2 animate-spin" />
                        İşlemler yükleniyor...
                    </div>
                ) : expenditures.length > 0 ? (
                    <>
                        <div className="space-y-3 mb-6">
                            {currentExpenditures.map((exp) => {
                                const dateField = exp.date?.toDate ? exp.date.toDate() : exp.date?.seconds ? new Date(exp.date.seconds * 1000) : new Date(exp.date || exp.createdAt);
                                const expTRY = exp.amountUSD * (exp.rate || usdToTryRate || 1);
                                const isCurrentIncome = exp.type === 'INCOME';
                                const amountColor = isCurrentIncome ? 'text-green-600' : 'text-red-600';
                                const amountSign = isCurrentIncome ? '+' : '-';
                                const icon = isCurrentIncome ? <PlusCircle className="w-4 h-4 inline mr-1" /> : <MinusCircle className="w-4 h-4 inline mr-1" />;
                                const categoryLabel = ALL_CATEGORIES.find(c => c.value === exp.category)?.label || exp.category || 'Belirtilmemiş';


                                return (
                                    <div key={exp.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex justify-between items-center hover:bg-gray-100 transition-colors">
                                        <div className="flex-1">
                                            <p className="font-medium text-gray-800">{exp.description}</p>
                                            <p className="text-xs text-gray-500 mt-1">
                                                <Calendar className="w-3 h-3 inline mr-1" />
                                                {dateField.toLocaleDateString('tr-TR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })} - Kur: {exp.rate?.toFixed(4) || usdToTryRate.toFixed(4)} ₺
                                                <span className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${isCurrentIncome ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {isCurrentIncome ? 'GELİR' : 'GİDER'} - {categoryLabel}
                                                </span>
                                            </p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <div className={`font-bold ${amountColor} flex items-center justify-end`}>
                                                {icon}
                                                {amountSign}{expTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                                ({amountSign}{exp.amountUSD.toFixed(2)} Dolar)
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between border-t pt-4">
                                <div className="text-sm text-gray-600 mb-2 sm:mb-0">
                                    Sayfa {currentPage} / {totalPages} -
                                    Gösterilen: {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)} / {totalItems}
                                </div>

                                <div className="flex items-center space-x-1">
                                    <button
                                        onClick={prevPage}
                                        disabled={currentPage === 1}
                                        className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>

                                    {getDisplayedPages().map(pageNumber => (
                                        <button
                                            key={pageNumber}
                                            onClick={() => goToPage(pageNumber)}
                                            className={`px-3 py-1 rounded-md text-sm ${currentPage === pageNumber
                                                    ? 'bg-indigo-600 text-white'
                                                    : 'text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {pageNumber}
                                        </button>
                                    ))}

                                    <button
                                        onClick={nextPage}
                                        disabled={currentPage === totalPages}
                                        className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}
                                    >
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Henüz bir işlem kaydı bulunmamaktadır.</p>
                        <p className="text-sm mt-1">Yukarıdaki formdan ilk harcamanızı/gelirinizi ekleyin.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BudgetTracker;