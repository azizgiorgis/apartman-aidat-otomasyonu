import React, { useState } from 'react';
import { db, getCollectionPath } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { Home, Plus, Loader2 } from 'lucide-react'; 

const ApartmentForm = ({ userId, showNotification }) => {
  const [block, setBlock] = useState('');
  const [aptNo, setAptNo] = useState('');
  const [owner, setOwner] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => { 
    e.preventDefault();
    if (!block || !aptNo || !owner) {
      showNotification("Lütfen tüm alanları doldurun.", "error");
      return;
    }

    if (!userId) {
        console.error("Kullanıcı kimliği (userId) mevcut değil.");
        showNotification("Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.", "error");
        return;
    }

    setLoading(true);
    const apartmentsPath = getCollectionPath(userId, "apartments");

    try {
      await addDoc(collection(db, apartmentsPath), {
        block: block.toUpperCase(),
        aptNo: parseInt(aptNo),
        owner: owner,
        createdAt: new Date(),
        currentDebtUSD: 0, 
      });
      showNotification('Daire başarıyla eklendi!', "success");
      setBlock('');
      setAptNo('');
      setOwner('');

    } catch (error) {
      console.error("Daire eklenirken hata oluştu:", error);
      showNotification('Daire eklenirken bir hata oluştu. Konsolu ve Firebase kurallarını kontrol edin.', "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg h-full">
        <h2 className="text-2xl font-extrabold text-gray-900 mb-6 border-b pb-2 flex items-center">
            <Home className="w-6 h-6 mr-2 text-indigo-600" /> Yeni Daire Kaydı
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg mx-auto">
            <div>
                <label htmlFor="block" className="block text-sm font-medium text-gray-700">Blok Adı (Örn: A, B, C)</label>
                <input
                    type="text"
                    id="block"
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                    placeholder="A"
                    maxLength="10"
                />
            </div>

            <div>
                <label htmlFor="aptNo" className="block text-sm font-medium text-gray-700">Daire No</label>
                <input
                    type="number"
                    id="aptNo"
                    value={aptNo}
                    onChange={(e) => setAptNo(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                    min="1"
                    placeholder="5, 12, 45..."
                />
            </div>

            <div>
                <label htmlFor="owner" className="block text-sm font-medium text-gray-700">Sahip/Sakin Adı</label>
                <input
                    type="text"
                    id="owner"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    required
                    placeholder="Ali Yılmaz"
                />
            </div>

            <button
                type="submit"
                disabled={loading}
                className={`w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white flex items-center justify-center ${loading ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700'}`}
            >
                {loading ? (
                    <span className="flex items-center"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Kaydediliyor...</span>
                ) : (
                    <span className="flex items-center"><Plus className="w-4 h-4 mr-2" /> Daireyi Kaydet</span>
                )}
            </button>
        </form>
    </div>
  );
};
export default ApartmentForm;