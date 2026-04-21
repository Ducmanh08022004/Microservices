import React, { createContext, useContext, useState, useEffect } from 'react';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
    const [wishlist, setWishlist] = useState(() => {
        try { return JSON.parse(localStorage.getItem('wishlist') || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
    }, [wishlist]);

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
