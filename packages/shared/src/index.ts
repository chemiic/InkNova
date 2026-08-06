export type ProductCategory =
  | "trykk"
  | "skilt"
  | "storformat"
  | "messe";

export type MoneyNOK = number;

export interface SizeOption {
  id: string;
  /** Display label, e.g. "A4" or "9×5 cm" */
  label: string;
  /** Price in NOK (øre-free whole kroner for MVP stubs) */
  price: MoneyNOK;
  /** Optional price delta vs base for UI hints */
  priceDelta?: MoneyNOK;
}

/** Custom size product (folie): max dimensions in cm */
export interface CustomSizeConfig {
  maxWidthCm: number;
  maxHeightCm: number;
  /** Base price stub; real pricing later */
  basePrice: MoneyNOK;
}

export interface DeliveryInfo {
  /** Short label from API, e.g. "3–5 virkedager" */
  label: string;
  /** Optional flat delivery fee in NOK; null = included / TBD */
  fee: MoneyNOK | null;
}

export interface Product {
  id: string;
  slug: string;
  category: ProductCategory;
  /** i18n key under products.<id>.name — or inline nb for seed */
  name: string;
  description: string;
  imageUrl: string;
  sizes: SizeOption[];
  customSize?: CustomSizeConfig;
  delivery: DeliveryInfo;
  leadTime: string;
}

export interface CartItem {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sizeId: string;
  sizeLabel: string;
  qty: number;
  /** Snapshot at add-to-cart time */
  unitPrice: MoneyNOK;
  /** Phase C (free editor later): optional until design step is required */
  designFileId?: string | null;
  templateId?: string | null;
}

export interface ContactPayload {
  email: string;
  message: string;
  name?: string;
}

export interface ApiSuccess {
  ok: true;
}

export interface ApiError {
  ok: false;
  message: string;
}
