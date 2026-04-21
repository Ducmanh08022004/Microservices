import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_CHANGED_EVENT, getScopedStorageKey } from '../utils/authStorage';

const CartContext = createContext(null);

function readCartByKey(scopedKey) {
    try {
        const scopedRaw = localStorage.getItem(scopedKey);
        if (scopedRaw !== null) {
            const parsed = JSON.parse(scopedRaw);
            return Array.isArray(parsed) ? parsed : [];
        }

        const legacyRaw = localStorage.getItem('cart');
        if (legacyRaw !== null) {
            const parsedLegacy = JSON.parse(legacyRaw);
            const safeLegacy = Array.isArray(parsedLegacy) ? parsedLegacy : [];
            localStorage.setItem(scopedKey, JSON.stringify(safeLegacy));
            localStorage.removeItem('cart');
            return safeLegacy;
        }

        return [];
    } catch {
        return [];
    }
}

export function CartProvider({ children }) {
    const [storageKey, setStorageKey] = useState(() => getScopedStorageKey('cart'));
    const [cart, setCart] = useState(() => readCartByKey(getScopedStorageKey('cart')));

    useEffect(() => {
        const syncCartByAuth = () => {
            const nextKey = getScopedStorageKey('cart');
            setStorageKey(nextKey);
            setCart(readCartByKey(nextKey));
        };

        window.addEventListener(AUTH_CHANGED_EVENT, syncCartByAuth);
        window.addEventListener('storage', syncCartByAuth);

        return () => {
            window.removeEventListener(AUTH_CHANGED_EVENT, syncCartByAuth);
            window.removeEventListener('storage', syncCartByAuth);
        };
    }, []);

    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(cart));
    }, [cart, storageKey]);

    const addToCart = (product, quantity = 1) => {
        setCart(prev => {
            const existing = prev.find(item => item.product_id === product.product_id);
            if (existing) {
                return prev.map(item =>
                    item.product_id === product.product_id
                        ? { ...item, quantity: item.quantity + quantity }
                        : item
                );
            }
            return [...prev, { ...product, quantity }];
        });
    };
    
    const removeFromCart = (productId) => 
        setCart(prev => prev.filter(i => i.product_id !== productId));
    
    const updateQuantity = (productId, quantity) =>
        setCart(prev => prev.map(i => 
            i.product_id === productId ? { ...i, quantity } : i));
    
    const clearCart = () => setCart([]);
    
    const totalItems = cart.reduce((sum, i) => sum + i.quantity, 0);
    const totalPrice = cart.reduce((sum, i) => 
        sum + (i.discount_price || i.price) * i.quantity, 0);

    return (
        <CartContext.Provider value={{ 
            cart, addToCart, removeFromCart, updateQuantity, 
            clearCart, totalItems, totalPrice 
        }}>
            {children}
        </CartContext.Provider>
    );
}

export const useCart = () => useContext(CartContext);
