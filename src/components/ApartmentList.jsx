import React, { useState, useEffect } from "react";
import { db, getCollectionPath } from "../firebase";
import { collection, query, orderBy, doc, updateDoc, deleteDoc, writeBatch, where, getDocs, increment } from "firebase/firestore";
import { Home, User, DollarSign, Loader2, ChevronDown, ChevronUp, Edit, Trash2, X, AlertTriangle, Calendar, List, CheckCircle, Share2, Building, Mail, Phone, CreditCard } from "lucide-react";
import Modal from "./Modal";

const ApartmentList = ({ usdToTryRate, userId, showNotification, showConfirmation }) => {
  const [apartments, setApartments] = useState([]);
  const [apartmentDues, setApartmentDues] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedApartments, setExpandedApartments] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingApartment, setEditingApartment] = useState(null);
  const [editBlock, setEditBlock] = useState('');
  const [editAptNo, setEditAptNo] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [selectedApartment, setSelectedApartment] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const apartmentsPath = getCollectionPath(userId, "apartments");
    let isMounted = true;
    let pollInterval;

    const fetchApartments = async () => {
      try {
        const apartmentsQuery = query(
          collection(db, apartmentsPath),
          orderBy("block", "asc")
        );

        const querySnapshot = await getDocs(apartmentsQuery);

        if (!isMounted) return;

        const apts = [];
        querySnapshot.forEach((doc) => {
          apts.push({ id: doc.id, ...doc.data() });
        });

        setApartments(apts);
        setLoading(false);
      } catch (error) {
        console.error("Daireler çekilirken hata:", error);
        showNotification("Daire listesi yükleniyor hata oluştu.", "error");
        setLoading(false);
      }
    };

    fetchApartments();

    pollInterval = setInterval(fetchApartments, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [userId, showNotification]);

  useEffect(() => {
    if (!userId) return;

    const duesPath = getCollectionPath(userId, "dues");
    let isMounted = true;
    let pollInterval;

    const fetchDues = async () => {
      try {
        const duesQuery = query(
          collection(db, duesPath),
          where("recordType", "==", "ACCRUAL")
        );

        const querySnapshot = await getDocs(duesQuery);

        if (!isMounted) return;

        const duesByApartment = {};

        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const aptId = data.apartmentId;

          if (aptId) {
            if (!duesByApartment[aptId]) {
              duesByApartment[aptId] = [];
            }
            duesByApartment[aptId].push({ id: doc.id, ...data });
          }
        });

        Object.keys(duesByApartment).forEach(aptId => {
          duesByApartment[aptId].sort((a, b) => {
            const yearDiff = b.year - a.year;
            if (yearDiff !== 0) return yearDiff;
            return b.month - a.month;
          });
        });

        console.log("✅ Borçlar başarıyla çekildi:", duesByApartment);
        setApartmentDues(duesByApartment);

      } catch (error) {
        console.error("❌ Aidatlar çekilirken hata:", error);
        showNotification("Aidat (Borç) bilgileri yüklenmede hata oluştu.", "error");
      }
    };

    fetchDues();

    pollInterval = setInterval(fetchDues, 5000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [userId, showNotification]);

  const filteredApartments = apartments.filter(apt =>
    apt.owner?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.block?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    apt.aptNo?.toString().includes(searchTerm)
  );

  const groupedApartments = filteredApartments.reduce((acc, apt) => {
    const block = apt.block || 'BLOKSUZ';
    if (!acc[block]) {
      acc[block] = [];
    }
    acc[block].push(apt);
    return acc;
  }, {});

  const toggleExpand = (block) => {
    setExpandedApartments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(block)) {
        newSet.delete(block);
      } else {
        newSet.add(block);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (expandedApartments.size === Object.keys(groupedApartments).length) {
      setExpandedApartments(new Set(Object.keys(groupedApartments)));
    } else {
      setExpandedApartments(new Set());
    }
  };

  const handleEdit = (apartment) => {
    setEditingApartment(apartment);
    setEditBlock(apartment.block);
    setEditAptNo(apartment.aptNo.toString());
    setEditOwner(apartment.owner);
    setIsEditModalOpen(true);
  };

  const handleShare = (apartment) => {
    setSelectedApartment(apartment);
    setIsShareModalOpen(true);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      showNotification('Link panoya kopyalandı!', 'success');
    }).catch(() => {
      showNotification('Link kopyalanırken hata oluştu.', 'error');
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editingApartment || !editBlock || !editAptNo || !editOwner) {
      showNotification("Lütfen tüm alanları doldurun.", "error");
      return;
    }

    setEditLoading(true);
    const apartmentsPath = getCollectionPath(userId, "apartments");
    const aptRef = doc(db, apartmentsPath, editingApartment.id);

    try {
      await updateDoc(aptRef, {
        block: editBlock.toUpperCase(),
        aptNo: parseInt(editAptNo),
        owner: editOwner,
      });
      showNotification('Daire bilgileri başarıyla güncellendi!', "success");
      setIsEditModalOpen(false);
    } catch (error) {
      console.error("Daire güncellenirken hata oluştu:", error);
      showNotification('Daire güncellenirken bir hata oluştu.', "error");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async (apartment) => {
    const isConfirmed = await showConfirmation(
      `${apartment.owner} - ${apartment.block} Blok Daire No: ${apartment.aptNo} dairesini silmek üzeresiniz. Borç bilgileri de dahil olmak üzere TÜM KAYITLAR silinecektir.\n\nONAYLIYOR MUSUNUZ?`
    );

    if (!isConfirmed) return;

    const apartmentsPath = getCollectionPath(userId, "apartments");
    const duesPath = getCollectionPath(userId, "dues");

    const apartmentRef = doc(db, apartmentsPath, apartment.id);
    const batch = writeBatch(db);

    try {
      batch.delete(apartmentRef);
      const duesQuery = query(
        collection(db, duesPath),
        where("apartmentId", "==", apartment.id)
      );
      const duesSnapshot = await getDocs(duesQuery);
      duesSnapshot.forEach((d) => {
        batch.delete(d.ref);
      });

      await batch.commit();

      showNotification('Daire ve tüm borç kayıtları başarıyla silindi!', "success");
      setExpandedApartments(prev => {
        const newSet = new Set(prev);
        newSet.delete(apartment.block);
        return newSet;
      });

    } catch (error) {
      console.error("Daire silinirken hata oluştu:", error);
      showNotification('Daire silinirken bir hata oluştu.', "error");
    }
  };

  const handlePaySingleDue = async (apartment, due) => {
    if (!usdToTryRate) {
      showNotification("Döviz kuru bilgisi yüklenmeden işlem yapılamaz.", "error");
      return;
    }

    const paymentAmountUSD = due.remainingDebtUSD || due.amountUSD;
    const paymentAmountTRY = paymentAmountUSD * (usdToTryRate || 1);

    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
    const dueMonth = monthNames[due.month - 1];
    const dueYear = due.year;

    const isConfirmed = await showConfirmation(
      `${apartment.owner} - ${dueMonth} ${dueYear} aidatını tahsil edeceksiniz.\n\n` +
      `Tutar: ${paymentAmountTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} (${paymentAmountUSD.toFixed(2)} USD)\n\n` +
      `Onaylıyor musunuz?`
    );

    if (!isConfirmed) return;

    const apartmentsPath = getCollectionPath(userId, "apartments");
    const duesPath = getCollectionPath(userId, "dues");
    const budgetPath = getCollectionPath(userId, "budget");
    const BUDGET_DOC_ID = 'main_budget';
    const expendituresPath = getCollectionPath(userId, "expenditures");

    const batch = writeBatch(db);

    try {
      const apartmentRef = doc(db, apartmentsPath, apartment.id);
      const newDebtUSD = (apartment.currentDebtUSD || 0) - paymentAmountUSD;
      batch.update(apartmentRef, {
        currentDebtUSD: newDebtUSD > 0 ? newDebtUSD : 0
      });

      const dueRef = doc(db, duesPath, due.id);
      batch.update(dueRef, {
        isPaid: true,
        paidAmountUSD: (due.paidAmountUSD || 0) + paymentAmountUSD,
        remainingDebtUSD: 0,
        paymentDate: new Date(),
        paymentRate: usdToTryRate,
        paymentAmountTRY: paymentAmountTRY,
      });

      const budgetRef = doc(db, budgetPath, BUDGET_DOC_ID);

      try {
        const budgetSnap = await getDoc(budgetRef);

        if (budgetSnap.exists()) {
          batch.update(budgetRef, {
            balanceUSD: increment(paymentAmountUSD)
          });
        } else {
          batch.set(budgetRef, {
            balanceUSD: paymentAmountUSD,
            createdAt: new Date(),
            lastUpdated: new Date()
          });
        }
      } catch (budgetCheckError) {
        console.error("Bütçe belgesi kontrol sırasında hata:", budgetCheckError);
        batch.set(budgetRef, {
          balanceUSD: paymentAmountUSD,
          lastUpdated: new Date()
        }, { merge: true });
      }

      const incomeRef = doc(collection(db, expendituresPath));
      batch.set(incomeRef, {
        amountUSD: paymentAmountUSD,
        type: 'INCOME',
        description: `${apartment.owner} (${apartment.block}-${apartment.aptNo}) ${dueMonth} ${dueYear} Aidat Tahsilatı`,
        date: new Date(),
        rate: usdToTryRate,
      });

      await batch.commit();
      showNotification(`${dueMonth} ${dueYear} aidatı başarıyla tahsil edildi!`, "success");

    } catch (error) {
      console.error("Tek aidat tahsilatında hata oluştu:", error);
      showNotification('Aidat tahsilatı sırasında bir hata oluştu.', "error");
    }
  };
  const handlePayAll = async (apartment, dues, debtUSD) => {
    if (!usdToTryRate) {
      showNotification("Döviz kuru bilgisi yüklenmeden işlem yapılamaz.", "error");
      return;
    }

    const finalizedDebtUSD = parseFloat(debtUSD);

    if (isNaN(finalizedDebtUSD) || finalizedDebtUSD <= 0) {
      showNotification("Tahsil edilecek geçerli bir borç miktarı bulunamadı.", "error");
      return;
    }

    const finalizedDebtTRY = finalizedDebtUSD * usdToTryRate;

    const isConfirmed = await showConfirmation(
      `${apartment.owner} - TÜM BORÇLARI tahsil edeceksiniz.\n\n` +
      `Toplam Tutar: ${finalizedDebtTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} (${finalizedDebtUSD.toFixed(2)} USD)\n\n` +
      `Onaylıyor musunuz?`
    );

    if (!isConfirmed) return;

    const apartmentsPath = getCollectionPath(userId, "apartments");
    const duesPath = getCollectionPath(userId, "dues");
    const budgetPath = getCollectionPath(userId, "budget");
    const BUDGET_DOC_ID = 'main_budget';
    const expendituresPath = getCollectionPath(userId, "expenditures");

    const batch = writeBatch(db);

    try {
      const apartmentRef = doc(db, apartmentsPath, apartment.id);
      batch.update(apartmentRef, { currentDebtUSD: 0 });

      dues.forEach(due => {
        const paymentAmountUSD = due.remainingDebtUSD || 0;

        if (paymentAmountUSD > 0) {
          const dueRef = doc(db, duesPath, due.id);
          const paymentAmountTRY = paymentAmountUSD * usdToTryRate;

          batch.update(dueRef, {
            isPaid: true,
            paidAmountUSD: (due.paidAmountUSD || 0) + paymentAmountUSD,
            remainingDebtUSD: 0,
            paymentDate: new Date(),
            paymentRate: usdToTryRate,
            paymentAmountTRY: paymentAmountTRY,
          });
        }
      });

      const budgetRef = doc(db, budgetPath, BUDGET_DOC_ID);

      try {
        const budgetSnap = await getDoc(budgetRef);

        if (budgetSnap.exists()) {
          batch.update(budgetRef, {
            balanceUSD: increment(finalizedDebtUSD)
          });
        } else {
          batch.set(budgetRef, {
            balanceUSD: finalizedDebtUSD,
            createdAt: new Date(),
            lastUpdated: new Date()
          });
        }
      } catch (budgetCheckError) {
        console.error("Bütçe belgesi kontrol sırasında hata:", budgetCheckError);
        batch.set(budgetRef, {
          balanceUSD: finalizedDebtUSD,
          lastUpdated: new Date()
        }, { merge: true });
      }

      const incomeRef = doc(collection(db, expendituresPath));
      batch.set(incomeRef, {
        amountUSD: finalizedDebtUSD,
        type: 'INCOME',
        description: `${apartment.owner} (${apartment.block}-${apartment.aptNo}) Tüm Borç Tahsilatı`,
        date: new Date(),
        rate: usdToTryRate,
      });

      await batch.commit();
      showNotification(`Tüm borçlar başarıyla tahsil edildi!`, "success");

    } catch (error) {
      console.error("Borç tahsilatında hata oluştu:", error);
      showNotification('Borç tahsilatı sırasında bir hata oluştu.', "error");
    }
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="w-8 h-8 mr-2 animate-spin" />
        Daireler ve borç bilgileri yükleniyor...
      </div>
    );
  }

  const EditModalContent = () => (
    <form onSubmit={handleEditSubmit} className="space-y-4">
      <div>
        <label htmlFor="editBlock" className="block text-sm font-medium text-gray-700">Blok/Kısım</label>
        <input
          type="text"
          id="editBlock"
          value={editBlock}
          onChange={(e) => setEditBlock(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
          placeholder="Örn: A, B, C Blok"
        />
      </div>

      <div>
        <label htmlFor="editAptNo" className="block text-sm font-medium text-gray-700">Daire No</label>
        <input
          type="number"
          id="editAptNo"
          value={editAptNo}
          onChange={(e) => setEditAptNo(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
          min="1"
          placeholder="5, 12, 45..."
        />
      </div>

      <div>
        <label htmlFor="editOwner" className="block text-sm font-medium text-gray-700">Sahip/Sakin Adı</label>
        <input
          type="text"
          id="editOwner"
          value={editOwner}
          onChange={(e) => setEditOwner(e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          required
          placeholder="Ali Yılmaz"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={editLoading}
          className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center justify-center ${editLoading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {editLoading ? (
            <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</span>
          ) : (
            <span className="flex items-center"><Edit className="w-4 h-4 mr-2" /> Değişiklikleri Kaydet</span>
          )}
        </button>
      </div>
    </form>
  );

  const ShareModalContent = () => {
    const ownerUserId = selectedApartment?.userId || userId;
    const shareLink = `${window.location.origin}/daire/${ownerUserId}/${selectedApartment?.id}`;

    return (
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <p className="text-blue-800 text-sm">
            <strong>Bilgi:</strong> Bu linki daire sahibiyle paylaşabilirsiniz.
            Daire sahibi sadece kendi borçlarını ve site harcamalarını görebilir,
            değişiklik yapamaz.
          </p>
        </div>

        <div>
          <p className="text-gray-700 mb-2">
            <strong>Daire:</strong> {selectedApartment?.owner} - {selectedApartment?.block} Blok Daire {selectedApartment?.aptNo}
          </p>

          <label className="block text-sm font-medium text-gray-700 mb-2">
            Paylaşılacak Link:
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              readOnly
              value={shareLink}
              className="flex-1 border border-gray-300 rounded-md p-2 text-sm bg-gray-50 font-mono"
            />
            <button
              onClick={() => copyToClipboard(shareLink)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition flex items-center whitespace-nowrap"
            >
              <Share2 className="w-4 h-4 mr-1" />
              Kopyala
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-2">
            Her daire için ayrı link oluşturulmuştur. Sadece bu daireye ait bilgileri gösterir.
          </p>
        </div>

        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 text-sm">
            <strong>🔒 Güvenlik Notu:</strong> Linki sadece daire sahibiyle paylaş. Link herkese açık olsa da, her link sadece o daireye ait bilgileri gösterir.
          </p>
        </div>

        <div className="bg-green-50 p-3 rounded-lg border border-green-200">
          <p className="text-green-800 text-sm">
            <strong>✓ Neler Görebilir:</strong>
          </p>
          <ul className="text-green-700 text-sm mt-2 list-disc list-inside space-y-1">
            <li>Kendi dairesinin borç bilgileri</li>
            <li>Site genel harcama kayıtları</li>
            <li>Site iletişim bilgileri</li>
          </ul>
        </div>

        <div className="bg-red-50 p-3 rounded-lg border border-red-200">
          <p className="text-red-800 text-sm">
            <strong>✗ Neler Göremez:</strong>
          </p>
          <ul className="text-red-700 text-sm mt-2 list-disc list-inside space-y-1">
            <li>Diğer dairelerin bilgileri</li>
            <li>Yönetim paneli (Daire ekleme, Harcama Ekleme vb...)</li>
            <li>Hesap, bütçe yönetimi</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white rounded-xl shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6">
        <div className="flex items-center mb-4 lg:mb-0">
          <Building className="w-8 h-8 mr-3 text-indigo-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Daire Yönetimi</h2>
            <p className="text-gray-600 text-sm">Toplam {apartments.length} daire</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Daire sahibi, blok veya daire no ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            onClick={toggleAll}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center"
          >
            {expandedApartments.size === Object.keys(groupedApartments).length ? (
              <>
                <ChevronUp className="w-4 h-4 mr-2" />
                Tümünü Kapat
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Tümünü Aç
              </>
            )}
          </button>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        title="Daire Bilgilerini Düzenle"
        onClose={() => setIsEditModalOpen(false)}
      >
        <EditModalContent />
      </Modal>

      <Modal
        isOpen={isShareModalOpen}
        title="Daire Linkini Paylaş"
        onClose={() => setIsShareModalOpen(false)}
      >
        <ShareModalContent />
      </Modal>

      {Object.keys(groupedApartments).length === 0 ? (
        <div className="text-center py-12">
          <Home className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Henüz kayıtlı daire bulunmamaktadır</p>
          <p className="text-gray-400 text-sm mt-2">"Daire Ekle" menüsünden başlayın</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groupedApartments).map(([block, apts]) => (
            <div key={block} className="border border-gray-200 rounded-xl shadow-sm overflow-hidden bg-white">
              <div
                className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-200 transition-all duration-200 flex justify-between items-center"
                onClick={() => toggleExpand(block)}
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                    <Building className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{block} Blok</h3>
                    <p className="text-sm text-gray-600">{apts.length} daire</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${apts.some(apt => apt.currentDebtUSD > 0)
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                    }`}>
                    {apts.some(apt => apt.currentDebtUSD > 0) ? 'Borçlu Daireler Var' : 'Tümü Ödenmiş'}
                  </span>
                  {expandedApartments.has(block) ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {expandedApartments.has(block) && (
                <div className="divide-y divide-gray-100">
                  {apts.sort((a, b) => a.aptNo - b.aptNo).map((apt) => {
                    const allDues = apartmentDues[apt.id] || [];

                    const aptDues = allDues.filter(due => !due.isPaid && (due.remainingDebtUSD > 0 || due.remainingDebtUSD === undefined));

                    const hasDebt = apt.currentDebtUSD > 0;
                    const debtUSD = apt.currentDebtUSD || 0;
                    const debtTRY = debtUSD * (usdToTryRate || 1);

                    return (
                      <div
                        key={apt.id}
                        className={`p-4 transition-all duration-200 ${hasDebt
                          ? 'bg-red-50 border-l-4 border-l-red-400'
                          : 'bg-white border-l-4 border-l-green-400'
                          }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3">
                          <div className="flex items-center mb-2 sm:mb-0">
                            <div className={`w-3 h-3 rounded-full mr-3 ${hasDebt ? 'bg-red-500' : 'bg-green-500'
                              }`} />
                            <div>
                              <div className="flex items-center">
                                <Home className="w-4 h-4 mr-2 text-gray-600" />
                                <span className="font-semibold text-gray-900">
                                  Daire {apt.aptNo}
                                </span>
                              </div>
                              <div className="flex items-center mt-1">
                                <User className="w-4 h-4 mr-2 text-gray-500" />
                                <span className="text-gray-700">{apt.owner}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(apt); }}
                              className="p-2 rounded-lg text-green-600 hover:bg-green-100 transition"
                              title="Link Paylaş"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleEdit(apt); }}
                              className="p-2 rounded-lg text-blue-600 hover:bg-blue-100 transition"
                              title="Düzenle"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(apt); }}
                              className="p-2 rounded-lg text-red-600 hover:bg-red-100 transition"
                              title="Sil"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-3">
                          {hasDebt ? (
                            <div className="space-y-4">
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex items-center">
                                    <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
                                    <span className="font-semibold text-red-700">Toplam Borç</span>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-xl font-bold text-red-600">
                                      {debtTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {debtUSD.toFixed(2)} Dolar
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                    Aylık Borç Detayı
                                  </p>
                                  {aptDues.sort((a, b) => {
                                    const dateA = a.accrualDate?.toDate ? a.accrualDate.toDate() : new Date(a.accrualDate);
                                    const dateB = b.accrualDate?.toDate ? b.accrualDate.toDate() : new Date(b.accrualDate);
                                    return dateA - dateB;
                                  }).map((due) => {
                                    const date = due.accrualDate?.toDate ? due.accrualDate.toDate() : new Date(due.accrualDate);

                                    const remainingUSD = due.remainingDebtUSD !== undefined ? due.remainingDebtUSD : due.amountUSD;
                                    const dueTRY = remainingUSD * (due.rate || usdToTryRate || 1);

                                    const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
                                    const dueMonth = monthNames[due.month - 1] || `Ay ${due.month}`;

                                    return (
                                      <div key={due.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                        <div className="flex items-center space-x-3">
                                          <Calendar className="w-4 h-4 text-gray-500" />
                                          <div>
                                            <div className="font-medium text-gray-900">
                                              {dueMonth} {due.year}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {date.toLocaleDateString('tr-TR')}
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                          <div className="text-right">
                                            <div className="font-semibold text-red-600">
                                              {dueTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
                                            </div>
                                            <div className="text-xs text-gray-500">
                                              {remainingUSD.toFixed(2)} Dolar
                                            </div>
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handlePaySingleDue(apt, due);
                                            }}
                                            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
                                            title="Bu ayın borcunu tahsil et"
                                          >
                                            Tahsil Et
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>

                                <button
                                  className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold flex items-center justify-center"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const isConfirmed = await showConfirmation(
                                      `${apt.owner} - TÜM BORÇLARI tahsil edeceksiniz.\n\n` +
                                      `Toplam Tutar: ${debtTRY.toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })} (${debtUSD.toFixed(2)} USD)\n\n` +
                                      `Onaylıyor musunuz?`
                                    );

                                    if (isConfirmed) {
                                      handlePayAll(apt, allDues, debtUSD);
                                    }
                                  }}
                                >
                                  <CreditCard className="w-5 h-5 mr-2" />
                                  Tüm Borçları Tahsil Et
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                              <p className="text-green-700 font-medium">Borç Bulunmuyor</p>
                              <p className="text-green-600 text-sm">Tüm aidatlar ödenmiş</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApartmentList;