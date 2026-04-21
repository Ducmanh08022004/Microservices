import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
    const [cart, setCart] = useState(() => {
        try { return JSON.parse(localStorage.getItem('cart') || '[]'); }
        catch { return []; }
    });

    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);

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
