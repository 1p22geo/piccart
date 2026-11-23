export type Role = 'user' | 'admin';

export type User = {
  id: number;
  email: string;
  username: string;
  role: Role;
  createdAt: string;
};

export type Product = {
  id: number;
  name: string;
  description: string;
  priceCents: number;
  stock: number;
  photos: string[]; // exactly 3 URLs of shape https://picsum.photos/400/400?seed=<seed>
  createdAt: string;
  updatedAt: string;
};

export type ProductInput = {
  name: string;
  description: string;
  priceCents: number;
  stock: number;
};

export type CartLine = {
  productId: number;
  name: string;
  qty: number;
  unitPriceCents: number;
  lineTotalCents: number;
  stock: number;   // current stock, may have changed since the line was added
  photo: string;   // photos[0]
};

export type CartView = {
  items: CartLine[];
  totalQty: number;
  subtotalCents: number;
};

export type ShippingFields = {
  fullName: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postalCode: string;
  country: string;
};

export type OrderItem = {
  productId: number;
  name: string;          // snapshot of the product name at purchase time
  qty: number;
  unitPriceCents: number; // snapshot of the price at purchase time
  lineTotalCents: number;
};

export type Order = {
  id: number;
  userId: number;
  status: 'PLACED';
  placedAt: string;
  shipping: ShippingFields;
  items: OrderItem[];
  totalCents: number;
};

export type StockConflict = {
  productId: number;
  name: string;
  requested: number;
  available: number;
};

export type FieldError = { field: string; message: string };
export type Validated<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };
