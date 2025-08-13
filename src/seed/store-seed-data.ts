
import type { CollectionConfig } from 'payload'

// Seed data for initial Willian setup
export const seedCategories = [
  {
    title: 'Electronics',
    slug: 'electronics',
    description: 'Electronic devices and accessories',
  },
  {
    title: 'Clothing',
    slug: 'clothing', 
    description: 'Fashion and apparel',
  },
  {
    title: 'Home & Garden',
    slug: 'home-garden',
    description: 'Home improvement and garden supplies',
  },
];

export const seedProducts = [
  {
    title: 'Sample Product 1',
    slug: 'sample-product-1',
    description: 'This is a sample product for your Willian store.',
    price: 2999, // $29.99 in cents
    currency: 'USD',
    category: 'electronics',
    status: 'published',
  },
  {
    title: 'Sample Product 2', 
    slug: 'sample-product-2',
    description: 'Another sample product to showcase your store.',
    price: 4999, // $49.99 in cents
    currency: 'USD',
    category: 'clothing',
    status: 'published',
  },
];

export const seedPages = [
  {
    title: 'Home',
    slug: 'home',
    layout: [
      {
        blockType: 'hero',
        heading: 'Welcome to Willian',
        subheading: 'Discover amazing products at great prices',
        media: null,
      },
      {
        blockType: 'content',
        content: [
          {
            children: [
              {
                text: 'Welcome to our store! We offer high-quality products with excellent customer service.',
              },
            ],
          },
        ],
      },
    ],
    status: 'published',
  },
];

export const seedGlobals = {
  header: {
    navItems: [
      { label: 'Home', url: '/' },
      { label: 'Products', url: '/products' },
      { label: 'About', url: '/about' },
      { label: 'Contact', url: '/contact' },
    ],
  },
  footer: {
    navItems: [
      { label: 'Privacy Policy', url: '/privacy' },
      { label: 'Terms of Service', url: '/terms' },
      { label: 'Shipping Info', url: '/shipping' },
    ],
    socialLinks: [
      { platform: 'twitter', url: '#' },
      { platform: 'facebook', url: '#' },
    ],
    copyright: '© 2024 Willian. All rights reserved.',
  },
  settings: {
    siteName: 'Willian',
    siteDescription: 'Modern e-commerce store',
    defaultCurrency: 'SAR',
    supportedCurrencies: ['SAR', 'USD', 'EUR'],
    enableTaxes: true,
    enableShipping: true,
  },
};
