import React, { useState, useEffect } from 'react';
import { DollarSign, RefreshCw, TrendingUp, TrendingDown, Info, CheckCircle2, AlertCircle, ExternalLink } from 'lucide-react';

const API_URL = "https://open.er-api.com/v6/latest/USD";

const CurrencyDisplay = ({ setUsdToTryRate }) => {
    const [rate, setRate] = useState(null);
    const [previousRate, setPreviousRate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const fetchRate = async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setIsRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        
        try {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error('API yanıtı başarısız oldu.');
            }
            const data = await response.json();
            const usdToTry = data.rates.TRY;

            if (usdToTry) {
                if (rate) {
                    setPreviousRate(rate);
                }
                setRate(usdToTry);
                setUsdToTryRate(usdToTry);
                setLastUpdated(new Date());
            } else {
                throw new Error('TRY kuru bilgisi API yanıtında bulunamadı.');
            }

        } catch (err) {
            console.error("Döviz Kuru Çekme Hatası:", err);
            setError("Döviz kuru çekilemedi. Varsayılan (32.00 TRY) kullanılıyor.");
            const defaultRate = 32.00;
            setRate(defaultRate);
            setUsdToTryRate(defaultRate);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchRate();
        
        const interval = setInterval(() => {
            fetchRate();
        }, 5 * 60 * 1000);

        return () => clearInterval(interval);
    }, []);

    const getRateChange = () => {
        if (!rate || !previousRate) return null;
        const change = rate - previousRate;
        const changePercent = ((change / previousRate) * 100);
        return {
            amount: change,
            percent: changePercent,
            isPositive: change > 0
        };
    };

    const rateChange = getRateChange();
    const formattedTime = lastUpdated ? lastUpdated.toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
    }) : null;

    const formatDate = (date) => {
        return date.toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-blue-900">Döviz Kuru</p>
                            <p className="text-xs text-blue-600">Yükleniyor...</p>
                        </div>
                    </div>
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-12 h-12 bg-white rounded-xl shadow-sm border border-indigo-100">
                        <DollarSign className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-indigo-900">Amerikan Doları / Türk Lirası Kuru</p>
                        <div className="flex items-center space-x-2">
                            <p className="text-2xl font-bold text-indigo-800">
                                {rate ? rate.toFixed(4) : 'N/A'} ₺
                            </p>
                            {rateChange && (
                                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    rateChange.isPositive 
                                        ? 'bg-red-100 text-red-700' 
                                        : 'bg-green-100 text-green-700'
                                }`}>
                                    {rateChange.isPositive ? (
                                        <TrendingUp className="w-3 h-3" />
                                    ) : (
                                        <TrendingDown className="w-3 h-3" />
                                    )}
                                    <span>
                                        {rateChange.isPositive ? '+' : ''}{rateChange.amount.toFixed(4)}
                                    </span>
                                    <span>({rateChange.isPositive ? '+' : ''}{rateChange.percent.toFixed(2)}%)</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => fetchRate(true)}
                        disabled={isRefreshing}
                        className={`p-2 rounded-lg transition-all duration-200 ${
                            isRefreshing 
                                ? 'bg-gray-100 text-gray-400' 
                                : 'bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-sm border border-indigo-200'
                        }`}
                        title="Kuru Güncelle"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    
                    <button
                        onClick={() => setShowDetails(!showDetails)}
                        className="p-2 rounded-lg bg-white text-indigo-600 hover:bg-indigo-50 hover:shadow-sm transition-all duration-200 border border-indigo-200"
                        title="Detayları Göster"
                    >
                        <Info className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {showDetails && (
                <div className="mt-4 pt-4 border-t border-indigo-200 space-y-3 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-indigo-700">Son Güncelleme:</span>
                                <span className="font-medium text-indigo-900">
                                    {formattedTime}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-indigo-700">Kaynak:</span>
                                <span className="font-medium text-indigo-900 flex items-center">
                                    ER-API
                                    <ExternalLink className="w-3 h-3 ml-1" />
                                </span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-indigo-700">Durum:</span>
                                <span className={`flex items-center font-medium ${
                                    error ? 'text-red-600' : 'text-green-600'
                                }`}>
                                    {error ? (
                                        <>
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Varsayılan
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="w-3 h-3 mr-1" />
                                            Canlı
                                        </>
                                    )}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-indigo-700">Otomatik Günc.:</span>
                                <span className="font-medium text-indigo-900">5 dk</span>
                            </div>
                        </div>
                    </div>

                    {lastUpdated && (
                        <div className="bg-white rounded-lg p-3 border border-indigo-100">
                            <p className="text-xs text-indigo-600 text-center">
                                Son güncelleme: {formatDate(lastUpdated)}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-xs text-yellow-700 text-center">
                                ⚠️ {error}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {!showDetails && (
                <div className="flex items-center justify-between text-xs text-indigo-600">
                    <div className="flex items-center space-x-4">
                        <span>Son güncelleme: {formattedTime}</span>
                        <span className="flex items-center">
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Otomatik
                        </span>
                    </div>
                    <span className="flex items-center">
                        <Info className="w-3 h-3 mr-1" />
                        Detaylar
                    </span>
                </div>
            )}

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
            `}</style>
        </div>
    );
};

export default CurrencyDisplay; 