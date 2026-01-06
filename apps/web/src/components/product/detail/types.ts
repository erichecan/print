/**
 * Type Definitions for Redbubble Product Detail
 */

export interface ProductData {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  longDescription?: string | null;
  artist: {
    name: string;
    slug: string;
    avatar: string;
    designCount: number;
    shopUrl: string;
  };
  price: {
    original: number;
    sale: number;
    currency: string;
    discountPercent: number;
    endsSoon: boolean;
    endsSoonText?: string;
  };
  style: {
    name: string;
    description: string;
    options: Array<{
      value: string;
      label: string;
      description: string;
    }>;
  };
  colors: Array<{
    name: string;
    hex: string;
    available: boolean;
    imageUrl?: string;
  }>;
  sizes: Array<{
    value: string;
    label: string;
    stock: number;
    available: boolean;
  }>;
  printLocations: Array<{
    value: string;
    label: string;
  }>;
  images: Array<{
    id: string;
    url: string;
    alt: string;
    thumbnail?: string;
  }>;
  rating: {
    average: number;
    count: number;
    breakdown?: {
      '5': number;
      '4': number;
      '3': number;
      '2': number;
      '1': number;
    };
  };
  delivery: {
    estimatedDate: string;
    country: string;
    countryFlag: string;
    shippingOptions?: Array<{
      name: string;
      days: string;
      price: number;
      free: boolean;
    }>;
  };
  returns: {
    policy: string;
    url: string;
  };
  features: string[];
  alsoAvailableOn: Array<{
    id: string;
    type: string;
    url: string;
    price: number;
    salePrice: number;
    discountPercent: number;
    link: string;
  }>;
  moreByArtist: Array<{
    id: string;
    title: string;
    url: string;
    price: number;
    link: string;
  }>;
  youMightLike: Array<{
    id: string;
    title: string;
    url: string;
    price: number;
    link: string;
  }>;
  tags: string[];
  trending: string[];
}

