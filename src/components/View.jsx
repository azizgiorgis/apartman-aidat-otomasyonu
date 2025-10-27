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

  useEffect(() => {
    const fetchData = async () => {
      if (!apartmentId || !userId) {
        setError('Gerekli parametreler eksik. Linkin doğru olduğundan emin olun.');
        setLoading(false);
        return;
      }

      try {
        console.log('Aranan daire ID:', apartmentId);
        console.log('Kullanıcı ID:', userId);
        
        const apartmentRef = doc(db, `users/${userId}/apartments`, apartmentId);
        const apartmentSnap = await getDoc(apartmentRef);
        
        console.log('Apartment snapshot exists:', apartmentSnap.exists());

        if (apartmentSnap.exists()) {
          const apartmentData = apartmentSnap.data();
          
          console.log('Daire bulundu:', apartmentData);
          
          setApartment({
            id: apartmentSnap.id,
            ...apartmentData
          });

          try {
            const settingsRef = doc(db, `users/${userId}/settings`, 'config');
            const settingsSnap = await getDoc(settingsRef);
            if (settingsSnap.exists()) {
              setSiteInfo(settingsSnap.data());
              console.log('Site bilgileri:', settingsSnap.data());
            }
          } catch (settingsError) {
            console.log('Site ayarları bulunamadı:', settingsError);
          }

          try {
            const duesQuery = query(
              collection(db, `users/${userId}/dues`),
              where('apartmentId', '==', apartmentId),
              orderBy('year', 'desc'),
              orderBy('month', 'desc')
            );
            
            const duesSnapshot = await getDocs(duesQuery);
            const duesData = [];
            
            duesSnapshot.forEach(doc => {
              duesData.push({ id: doc.id, ...doc.data() });
            });
            
            setDues(duesData);
            console.log('Borçlar yüklendi:', duesData.length, 'adet');
          } catch (duesError) {
            console.error('Borçlar yüklenirken hata:', duesError);
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
            
            setExpenditures(expendituresData);
            console.log('Harcamalar yüklendi:', expendituresData.length, 'adet');
          } catch (expendituresError) {
            console.error('Harcamalar yüklenirken hata:', expendituresError);
          }

          setError('');
        } else {
          console.log('Daire bulunamadı');
          setError('Daire bulunamadı. Linkin doğru olduğundan emin olun.');
        }

        setLoading(false);

      } catch (err) {
        console.error('Veri çekilirken genel hata:', err);
        setError('Veriler yüklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
        setLoading(false);
      }
    };

    fetchData();
  }, [apartmentId, userId]);

  console.log('Current state:', { loading, error, apartment: apartment ? apartment.owner : null, dues: dues.length, expenditures: expenditures.length });

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
          <p className="mt-4 text-red-600 text-lg">{error}</p>
          <p className="text-gray-500 text-sm mt-2">Lütfen linki kontrol edin veya site yöneticisiyle iletişime geçin.</p>
          <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
            <p className="text-sm text-gray-600">Debug Bilgisi:</p>
            <p className="text-xs text-gray-500">Kullanıcı ID: {userId}</p>
            <p className="text-xs text-gray-500">Daire ID: {apartmentId}</p>
            <p className="text-xs text-gray-500">Link: {window.location.href}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!apartment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto" />
          <p className="mt-4 text-gray-600">Daire bulunamadı.</p>
        </div>
      </div>
    );
  }

  const totalDebt = dues.reduce((sum, due) => sum + (due.amountUSD || 0), 0);
  const hasDebt = totalDebt > 0;
  const currentRate = 42;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <Home className="w-6 h-6 mr-2 text-indigo-600" />
                {apartment.block} Blok - Daire {apartment.aptNo}
              </h1>
              <p className="text-gray-600 mt-1 flex items-center">
                <User className="w-4 h-4 mr-1" />
                {apartment.owner}
              </p>
            </div>
            <div className={`px-4 py-2 rounded-full ${hasDebt ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
              {hasDebt ? 'Borçlu' : 'Borç Yok'}
            </div>
          </div>
          
          {siteInfo && (
            <div className="flex items-center text-gray-600 border-t pt-4">
              <Building className="w-4 h-4 mr-2" />
              <span>{siteInfo.siteName || 'Site/Apartman'}</span>
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
                  <div className="text-center p-4 bg-red-50 rounded-lg">
                    <p className="text-sm text-gray-600">Toplam Borç</p>
                    <p className="text-2xl font-bold text-red-600">
                      {(totalDebt * currentRate).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                    </p>
                    <p className="text-sm text-gray-500">({totalDebt.toFixed(2)} Dolar)</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Borç Detayı:</h3>
                    <div className="space-y-2">
                      {dues.map((due) => {
                        const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                        const dueMonth = monthNames[due.month - 1] || `Ay ${due.month}`;
                        const dueAmountTRY = due.amountUSD * (due.rate || currentRate);
                        const date = due.accrualDate?.toDate ? due.accrualDate.toDate() : new Date(due.accrualDate);
                        
                        return (
                          <div key={due.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-2 text-gray-500" />
                              <div>
                                <span className="block text-sm font-medium">{dueMonth} {due.year}</span>
                                <span className="text-xs text-gray-500">
                                  {date.toLocaleDateString('tr-TR')}
                                </span>
                              </div>
                            </div>
                            <span className="font-semibold text-red-600">
                              {dueAmountTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center p-6">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <p className="text-green-600 font-semibold">Tüm aidatlar ödenmiş</p>
                  <p className="text-gray-500 text-sm mt-1">Herhangi bir borç bulunmamaktadır</p>
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
                <div className="space-y-3">
                  {expenditures.map((exp) => {
                    const date = exp.date?.toDate ? exp.date.toDate() : new Date(exp.date);
                    const amountTRY = exp.amountUSD * (exp.rate || currentRate);
                    const isIncome = exp.type === 'INCOME';
                    
                    return (
                      <div key={exp.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <div className="flex-1">
                          <p className="font-medium text-gray-800">{exp.description}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {date.toLocaleDateString('tr-TR')}
                            {exp.rate && (
                              <span className="ml-2">• Kur: {exp.rate.toFixed(2)} ₺</span>
                            )}
                          </p>
                        </div>
                        <div className={`font-semibold text-right ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                          <div>{isIncome ? '+' : '-'}{amountTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}</div>
                          <div className="text-xs text-gray-500">
                            ({isIncome ? '+' : '-'}{exp.amountUSD.toFixed(2)} Dolar)
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">Henüz harcama kaydı bulunmamaktadır</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start">
                <Eye className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-800">Bilgilendirme</h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Bu sayfada sadece sizin dairenize ait borç bilgileri ve site genel harcamalarını görebilirsiniz. 
                    Değişiklik yapma yetkiniz bulunmamaktadır.
                  </p>
                  {siteInfo && siteInfo.contactInfo && (
                    <p className="text-blue-600 text-xs mt-2">
                      <strong>İletişim:</strong> {siteInfo.contactInfo}
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