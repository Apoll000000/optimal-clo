"use client";

import React, {
    createContext,
    useContext,
    useEffect,
    useReducer,
    ReactNode,
} from "react";
import { CartItem } from "@/types";

type CartState = {
    items: CartItem[];
};

type CartAction =
    | { type: "ADD_ITEM"; payload: CartItem }
    | { type: "REMOVE_ITEM"; payload: string }
    | { type: "CLEAR_CART" };

type CartContextType = {
    state: CartState;
    addItem: (item: CartItem) => void;
    removeItem: (id: string) => void;
    clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

const initialState: CartState = {
    items: [],
};

function cartReducer(state: CartState, action: CartAction): CartState {
    switch (action.type) {
        case "ADD_ITEM": {
            const existing = state.items.find(
                (item) => item.id === action.payload.id
            );

            if (existing) {
                return {
                    items: state.items.map((item) =>
                        item.id === action.payload.id
                            ? { ...item, quantity: item.quantity + action.payload.quantity }
                            : item
                    ),
                };
            }

            return { items: [...state.items, action.payload] };
        }

        case "REMOVE_ITEM":
            return {
                items: state.items.filter((item) => item.id !== action.payload),
            };

        case "CLEAR_CART":
            return { items: [] };

        default:
            return state;
    }
}

/** ✅ NAMED EXPORT — ito yung ina-import mo */
export function CartProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(cartReducer, initialState);

    // load from localStorage
    useEffect(() => {
        const stored = localStorage.getItem("cart");
        if (stored) {
            dispatch({
                type: "CLEAR_CART",
            });
            JSON.parse(stored).forEach((item: CartItem) => {
                dispatch({ type: "ADD_ITEM", payload: item });
            });
        }
    }, []);

    // save to localStorage
    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(state.items));
    }, [state.items]);

    const addItem = (item: CartItem) =>
        dispatch({ type: "ADD_ITEM", payload: item });

    const removeItem = (id: string) =>
        dispatch({ type: "REMOVE_ITEM", payload: id });

    const clearCart = () => dispatch({ type: "CLEAR_CART" });

    return (
        <CartContext.Provider
            value={{ state, addItem, removeItem, clearCart }}
        >
            {children}
        </CartContext.Provider>
    );
}

/** custom hook */
export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error("useCart must be used within CartProvider");
    }
    return context;
}
