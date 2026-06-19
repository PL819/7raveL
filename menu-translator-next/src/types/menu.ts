export type ViewState = "upload" | "menu" | "cart";

export type TranslationLanguage =
  | "en"
  | "zh-TW"
  | "fa"
  | "ru" // Russian
  | "si" // Sinhala - Sri Lanka
  | "hi"; // Hindi - India

export type MenuAnalysisStatus = "idle" | "loading" | "success" | "error";

export interface MenuItem {
  id: string;
  originalName: string;
  translatedName: string;
  price: number | null;
  description?: string;
  categoryId: string;
  notes?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  items: MenuItem[];
}

export interface MenuData {
  id: string;
  sourceImageName?: string;
  currency: string;
  categories: MenuCategory[];
  createdAt: string;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface CartSummary {
  items: CartItem[];
  totalQuantity: number;
  subtotal: number;
  currency: string;
}

export interface MenuAnalysisError {
  message: string;
  code?: string;
}
