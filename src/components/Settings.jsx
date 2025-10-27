import React, { useState, useEffect } from 'react';
import { db, getCollectionPath } from '../firebase'; 
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Settings as SettingsIcon, Save, Loader2 } from 'lucide-react';

const SETTINGS_DOC_ID = 'config'; 

const Settings = ({ setSiteName, userId, showNotification }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('APARTMENT'); 
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (!userId) return;

        const settingsPath = getCollectionPath(userId, "settings");
        const settingsDocRef = doc(db, settingsPath, SETTINGS_DOC_ID);

        const unsubscribe = onSnapshot(settingsDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setName(data.siteName || '');
                setType(data.type || 'APARTMENT');
                setSiteName(data.siteName || ''); 
            }
            setLoading(false);
        }, (error) => {
            console.error("Ayarlar dinlenirken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [setSiteName, userId]);

    const handleSave = async (e) => {
        e.preventDefault();
        if (!name) {
            showNotification("Lütfen bir isim giriniz.", "error");
            return;
        }

        if (!userId) {
            console.error("Kullanıcı kimliği (userId) mevcut değil.");
            showNotification("Kullanıcı kimliği bulunamadı. Lütfen tekrar giriş yapın.", "error");
            return;
        }

        setIsSaving(true);
        const settingsPath = getCollectionPath(userId, "settings");
        const settingsDocRef = doc(db, settingsPath, SETTINGS_DOC_ID);


        try {
            await setDoc(settingsDocRef, {
                siteName: name,
                type: type,
                lastUpdated: new Date()
            }, { merge: true }); 

            showNotification('Ayarlar başarıyla kaydedildi!', "success");
        } catch (error) {
            console.error("Ayarlar kaydedilirken hata oluştu:", error);
            showNotification('Ayarlar kaydedilirken bir hata oluştu. Konsolu kontrol edin.', "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <span className="ml-3 text-lg font-medium text-gray-700">Ayarlar yükleniyor...</span>
            </div>
        );
    }


    return (
        <div className="bg-white p-6 rounded-xl shadow-lg h-full">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 border-b pb-2 flex items-center">
                <SettingsIcon className="w-6 h-6 mr-2 text-purple-600" /> Sistem Ayarları
            </h2>

            <form onSubmit={handleSave} className="space-y-4 max-w-lg mx-auto">
                <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">Site/Apartman Adı </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        required
                        placeholder="Örn: Huzur Sitesi"
                    />
                </div>

                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">Yönetim Tipi</label>
                    <select
                        id="type"
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    >
                        <option value="APARTMENT">Apartman</option>
                        <option value="SITE">Site (Bloklu)</option>
                    </select>
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 flex items-center justify-center"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} 
                    {isSaving ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
                </button>
            </form>
        </div>
    );
};

export default Settings;