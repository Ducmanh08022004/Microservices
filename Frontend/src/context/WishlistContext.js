import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_CHANGED_EVENT, getScopedStorageKey } from '../utils/authStorage';

const WishlistContext = createContext(null);

function readWishlistByKey(scopedKey) {
    try {
        const scopedRaw = localStorage.getItem(scopedKey);
        if (scopedRaw !== null) {
            const parsed = JSON.parse(scopedRaw);
            return Array.isArray(parsed) ? parsed : [];
        }

        const legacyRaw = localStorage.getItem('wishlist');
        if (legacyRaw !== null) {
            const parsedLegacy = JSON.parse(legacyRaw);
            const safeLegacy = Array.isArray(parsedLegacy) ? parsedLegacy : [];
            localStorage.setItem(scopedKey, JSON.stringify(safeLegacy));
            localStorage.removeItem('wishlist');
            return safeLegacy;
        }

        return [];
    } catch {
        return [];
    }
}

export function WishlistProvider({ children }) {
    const [storageKey, setStorageKey] = useState(() => getScopedStorageKey('wishlist'));
    const [wishlist, setWishlist] = useState(() => readWishlistByKey(getScopedStorageKey('wishlist')));

    useEffect(() => {
        const syncWishlistByAuth = () => {
            const nextKey = getScopedStorageKey('wishlist');
            setStorageKey(nextKey);
            setWishlist(readWishlistByKey(nextKey));
        };

        window.addEventListener(AUTH_CHANGED_EVENT, syncWishlistByAuth);
        window.addEventListener('storage', syncWishlistByAuth);

        return () => {
            window.removeEventListener(AUTH_CHANGED_EVENT, syncWishlistByAuth);
            window.removeEventListener('storage', syncWishlistByAuth);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(wishlist));
    }, [wishlist, storageKey]);

    const addToWishlist = (product) => {
        setWishlist(prev => {
            if (prev.find(item => item.product_id === product.product_id)) return prev;
            return [...prev, product];
        });
    };

    const removeFromWishlist = (productId) => {
        setWishlist(prev => prev.filter(i => i.product_id !== productId));
    };

    const isWishlisted = (productId) => {
        return wishlist.some(i => i.product_id === productId);
    };

    return (
        <WishlistContext.Provider value={{
            wishlist, addToWishlist, removeFromWishlist, isWishlisted
        }}>
            {children}
        </WishlistContext.Provider>
    );
}

export const useWishlist = () => useContext(WishlistContext);
