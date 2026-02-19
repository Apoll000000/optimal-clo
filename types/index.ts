export type ProductImage = { url: string; alt?: string; isPrimary?: boolean };

export type Product = {
    _id: string;
    slug?: string;
    name: string;
    description?: string;
    price: number;
    comparePrice?: number;
    stock: number;
    sku?: string;
    images?: ProductImage[];
    categories?: { name: string }[];
};

export type CartItem = {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image?: string;
    sku?: string;
    variant?: { name: string; value: string } | null;
};
