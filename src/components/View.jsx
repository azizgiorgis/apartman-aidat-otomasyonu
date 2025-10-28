import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import { collection, getDocs, query, where, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { Home, User, DollarSign, Calendar, Eye, AlertTriangle, CheckCircle, Receipt, Building } from 'lucide-react';

const View = () => {
  const { userId, apartmentId } = useParams();
  const [apartment, setApartment] = useState(null);
  const [siteInfo, setSiteInfo] = useState(null);
  const [dues, setDues] = useState([]);
  const [expenditures, setExpenditures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usdToTryRate, setUsdToTryRate] = useState(42);

  useEffect(() => {
    const fetchRate = async () => {
      try {
        const API_URL = "https://open.er-api.com/v6/latest/USD";
        const response = await fetch(API_URL);

        if (!response.ok) {
          throw new Error('API yanıtı başarısız oldu.');
        }

        const data = await response.json();
        const usdToTry = data.rates.TRY;

        if (usdToTry) {
          setUsdToTryRate(usdToTry);
        } else {
          console.error('TRY kuru bilgisi API yanıtında bulunamadı.');
        }
      } catch (error) {
        console.error('Kur bilgisi çekilemedi, sabit kur (42) kullanılıyor:', error);
      }
    };
    fetchRate();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!apartmentId || !userId) {
        setError('Gerekli parametreler eksik. Linkin doğru olduğundan emin olun.');
        setLoading(false);
        return;
      }

      try {
        const apartmentRef = doc(db, `users/${userId}/apartments`, apartmentId);
        const apartmentSnap = await getDoc(apartmentRef);

        if (!apartmentSnap.exists()) {
          setError('Daire bulunamadı. Linkin doğru olduğundan emin olun.');
          setLoading(false);
          return;
        }

        setApartment({
          id: apartmentSnap.id,
          ...apartmentSnap.data()
        });

        try {
          const settingsRef = doc(db, `users/${userId}/settings`, 'config');
          const settingsSnap = await getDoc(settingsRef);
          if (settingsSnap.exists()) {
            setSiteInfo(settingsSnap.data());
          }
        } catch (settingsError) {
          console.log('Site ayarları bulunamadı:', settingsError);
        }

        try {
          const duesQuery = query(
            collection(db, `users/${userId}/dues`),
            where('apartmentId', '==', apartmentId)
          );

          const duesSnapshot = await getDocs(duesQuery);
          let allDuesData = [];

          duesSnapshot.forEach(doc => {
            allDuesData.push({ id: doc.id, ...doc.data() });
          });

          allDuesData = allDuesData.sort((a, b) => {
            const yearDiff = b.year - a.year;
            if (yearDiff !== 0) return yearDiff;
            return b.month - a.month;
          });

          console.log("✅ Tüm borçlar:", allDuesData);

          const unpaidDues = allDuesData.filter(due => {
            const remaining = due.remainingDebtUSD !== undefined
              ? due.remainingDebtUSD
              : due.amountUSD || 0;
            return remaining > 0;
          });

          console.log("✅ Filtrelenmiş (ödenmemiş) borçlar:", unpaidDues);
          console.log("✅ Daire ID:", apartmentId);

          setDues(unpaidDues);
        } catch (duesError) {
          console.error('❌ Borçlar yüklenirken hata:', duesError);
          setDues([]);
        }

        try {
          const expendituresQuery = query(
            collection(db, `users/${userId}/expenditures`),
            orderBy('date', 'desc'),
            limit(10)
          );

          const expendituresSnapshot = await getDocs(expendituresQuery);
          const expendituresData = [];

          expendituresSnapshot.forEach(doc => {
            expendituresData.push({ id: doc.id, ...doc.data() });
          });

          console.log("✅ Harcamalar:", expendituresData);
          setExpenditures(expendituresData);
        } catch (expendituresError) {
          console.error('❌ Harcamalar yüklenirken hata:', expendituresError);
          setExpenditures([]);
        }

        setError('');
      } catch (err) {
        console.error('❌ Veri çekilirken genel hata:', err);
        setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [apartmentId, userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Daire bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 max-w-md text-center">
          <Home className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
          <p className="text-yellow-700 font-semibold">Daire bulunamadı</p>
        </div>
      </div>
    );
  }

  const totalDebtUSD = dues.reduce((sum, due) => {
    const remainingUSD = due.remainingDebtUSD !== undefined
      ? due.remainingDebtUSD
      : due.amountUSD || 0;
    return sum + remainingUSD;
  }, 0);

  const hasDebt = totalDebtUSD > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Home className="w-6 h-6 mr-2 text-indigo-600" />
                {apartment?.block} Blok - Daire {apartment?.aptNo}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center">
                <User className="w-4 h-4 mr-1" />
                {apartment?.owner}
              </p>
            </div>

            <div
              className={`px-4 py-2 rounded-full font-semibold ${hasDebt
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800'
                }`}
            >
              {hasDebt ? '🔴 Borçlu' : '🟢 Borç Yok'}
            </div>
          </div>

          {siteInfo?.siteName && (
            <div className="flex items-center text-gray-600 border-t pt-4">
              <Building className="w-4 h-4 mr-2" />
              <span>{siteInfo.siteName}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-red-600" />
                Borç Durumu
              </h2>

              {hasDebt ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm text-gray-600 font-medium">Toplam Borç</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">
                      {(totalDebtUSD * usdToTryRate).toLocaleString('tr-TR', {
                        style: 'currency',
                        currency: 'TRY'
                      })}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      ({totalDebtUSD.toFixed(2)} USD)
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Kur: {usdToTryRate.toFixed(2)} ₺
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-3">Aylık Borç Detayları:</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {dues.length > 0 ? (
                        dues
                          .sort((a, b) => {
                            const dateA = a.accrualDate?.toDate
                              ? a.accrualDate.toDate()
                              : new Date(a.accrualDate);
                            const dateB = b.accrualDate?.toDate
                              ? b.accrualDate.toDate()
                              : new Date(b.accrualDate);
                            return dateA - dateB;
                          })
                          .map((due) => {
                            const monthNames = [
                              "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                              "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
                            ];
                            const dueMonth = monthNames[due.month - 1] || `Ay ${due.month}`;
                            const remainingUSD = due.remainingDebtUSD !== undefined
                              ? due.remainingDebtUSD
                              : due.amountUSD || 0;
                            const dueAmountTRY = remainingUSD * (due.rate || usdToTryRate);
                            const date = due.accrualDate?.toDate
                              ? due.accrualDate.toDate()
                              : new Date(due.accrualDate);

                            return (
                              <div
                                key={due.id}
                                className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200"
                              >
                                <div className="flex items-center">
                                  <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                                  <div>
                                    <span className="block text-sm font-semibold text-gray-900">
                                      {dueMonth} {due.year}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {date.toLocaleDateString('tr-TR')}
                                    </span>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="font-bold text-red-600 block">
                                    {dueAmountTRY.toLocaleString('tr-TR', {
                                      style: 'currency',
                                      currency: 'TRY'
                                    })}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {remainingUSD.toFixed(2)} USD
                                  </span>
                                </div>
                              </div>
                            );
                          })
                      ) : (
                        <p className="text-gray-500 text-sm text-center py-4">
                          Borç kaydı bulunamadı
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-3" />
                  <p className="text-green-700 font-bold text-lg">Tüm Aidatlar Ödenmiş</p>
                  <p className="text-green-600 text-sm mt-2">
                    Herhangi bir borç bulunmamaktadır ✓
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                Son Site Harcamaları
              </h2>

              {expenditures.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenditures.map((exp) => {
                    const date = exp.date?.toDate
                      ? exp.date.toDate()
                      : new Date(exp.date);
                    const amountTRY = exp.amountUSD * (exp.rate || usdToTryRate);
                    const isIncome = exp.type === 'INCOME';

                    return (
                      <div
                        key={exp.id}
                        className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition border border-gray-200"
                      >
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">
                            {exp.description}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {date.toLocaleDateString('tr-TR')}
                            {exp.rate && (
                              <span className="ml-2">• {exp.rate.toFixed(2)} ₺</span>
                            )}
                          </p>
                        </div>
                        <div className={`font-bold text-right ${isIncome ? 'text-green-600' : 'text-red-600'
                          }`}>
                          <div>
                            {isIncome ? '+' : '-'}
                            {amountTRY.toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </div>
                          <div className="text-xs text-gray-500">
                            {isIncome ? '+' : '-'}{exp.amountUSD.toFixed(2)} USD
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="font-medium">Harcama Kaydı Bulunmamaktadır</p>
                  <p className="text-sm mt-1">Site henüz harcama kaydı oluşturmamıştır</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <Eye className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-blue-900">Bilgilendirme</h3>
                  <p className="text-blue-700 text-sm mt-2">
                    Bu sayfada sadece <strong>sizin dairenize ait</strong> borç bilgileri ve site genel harcamalarını görebilirsiniz.
                    Herhangi bir değişiklik yapma yetkiniz bulunmamaktadır.
                  </p>
                  {siteInfo?.contactInfo && (
                    <p className="text-blue-600 text-xs mt-3 bg-white p-2 rounded">
                      <strong>📞 İletişim:</strong> {siteInfo.contactInfo}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default View;