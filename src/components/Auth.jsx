import React, { useState } from 'react';
import { auth } from '../firebase';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail
} from 'firebase/auth';
import { AlertCircle, LogIn, UserPlus } from 'lucide-react';

const Auth = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');

    const handleAuth = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (isLogin) {
            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (err) {
                setError(getFirebaseErrorMessage(err.code));
            }
        } else {
            try {
                await createUserWithEmailAndPassword(auth, email, password);
            } catch (err) {
                setError(getFirebaseErrorMessage(err.code));
            }
        }
    };

    const handlePasswordReset = () => {
        if (!email) {
            setError("Şifre sıfırlama için lütfen e-posta adresinizi girin.");
            return;
        }
        sendPasswordResetEmail(auth, email)
            .then(() => {
                setMessage("Şifre sıfırlama e-postası gönderildi. Lütfen spam kutunuzu kontrol edin.");
                setError('');
            })
            .catch((err) => {
                setError(getFirebaseErrorMessage(err.code));
            });
    };

    const getFirebaseErrorMessage = (code) => {
        switch (code) {
            case 'auth/invalid-email':
                return 'Geçersiz e-posta adresi.';
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                return 'E-posta veya şifre hatalı.';
            case 'auth/email-already-in-use':
                return 'Bu e-posta adresi zaten kullanımda.';
            case 'auth/weak-password':
                return 'Şifre en az 6 karakter olmalıdır.';
            default:
                return 'Bir hata oluştu. Lütfen tekrar deneyin.';
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
                <h2 className="text-3xl font-extrabold text-center text-gray-900 mb-6">
                    Yönetici Paneli
                </h2>
                <h3 className='text-xl text-center text-gray-700 mb-6'>
                    {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                </h3>

                {error && (
                    <div className="p-3 bg-red-100 text-red-700 rounded-lg mb-4 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span>{error}</span>
                    </div>
                )}
                {message && (
                    <div className="p-3 bg-green-100 text-green-700 rounded-lg mb-4">
                        <span>{message}</span>
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                            E-posta Adresi
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3"
                            placeholder="apartman@yonetimi.com"
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                            Şifre
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete="current-password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3"
                            placeholder="••••••••"
                        />
                    </div>

                    {isLogin && (
                        <div className="text-sm text-right">
                            <button
                                type="button"
                                onClick={handlePasswordReset}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                Şifrenizi mi unuttunuz?
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center"
                    >
                        {isLogin ? <LogIn className="w-5 h-5 mr-2" /> : <UserPlus className="w-5 h-5 mr-2" />}
                        {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
                    </button>

                    <div className="text-sm text-center">
                        <button
                            type="button"
                            onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                            className="font-medium text-indigo-600 hover:text-indigo-500"
                        >
                            {isLogin ? 'Hesabınız yok mu? Kayıt Olun' : 'Zaten hesabınız var mı? Giriş Yapın'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Auth;