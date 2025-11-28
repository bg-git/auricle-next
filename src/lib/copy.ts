// lib/copy.ts
import type { Region } from './region';

type DetailFieldKey =
  | 'title'
  | 'name'
  | 'sku'
  | 'metal'
  | 'alloy'
  | 'metal_colour'
  | 'thread_type'
  | 'fitting'
  | 'gem_type'
  | 'gem_colour'
  | 'gauge'
  | 'base_size'
  | 'length'
  | 'width'
  | 'height'
  | 'sold_as'
  | 'shipping';

type CopyMap = {
  taxLabel: string;
  gemColourLabel: string;
  metalColourLabel: string;
  shippingFromText: string;
  prioritiseSentence: string;
  gbpPriceNote: string;

  // collection filter headings
  metalLabel: string;
  finishLabel: string;
  gemTypeLabel: string;
  fittingLabel: string;

  // product details table labels
  detailLabels: Record<DetailFieldKey, string>;
};


const copyByRegion: Record<Region, CopyMap> = {
 uk: {
  taxLabel: 'VAT & shipping calculated at checkout',
  gemColourLabel: 'Gem Colour',
  metalColourLabel: 'Metal Colour',
  shippingFromText: 'Ships from United Kingdom',
  prioritiseSentence:
    'Our designs prioritise clean lines, timeless shapes, and genuine materials.',
  gbpPriceNote: 'Prices shown in GBP.',

  metalLabel: 'Metal',
  finishLabel: 'Finish',
  gemTypeLabel: 'Gem Type',
  fittingLabel: 'Fitting',

  detailLabels: {
      title: 'Title',
      name: 'Name',
      sku: 'SKU',
      metal: 'Metal',
      alloy: 'Alloy',
      metal_colour: 'Metal Colour',
      thread_type: 'Thread Type',
      fitting: 'Fitting',
      gem_type: 'Gem Type',
      gem_colour: 'Gem Colour',
      gauge: 'Gauge',
      base_size: 'Base Size',
      length: 'Length',
      width: 'Width',
      height: 'Height',
      sold_as: 'Sold As',
      shipping: 'Shipping',
    },
  },
  us: {
  taxLabel: 'Tax & shipping calculated at checkout',
  gemColourLabel: 'Gem Color',
  metalColourLabel: 'Metal Color',
  shippingFromText: 'Ships from the UK',
  prioritiseSentence:
    'Our designs prioritize clean lines, timeless shapes, and genuine materials.',
  gbpPriceNote: 'Prices shown in GBP.',

  metalLabel: 'Metal',
  finishLabel: 'Finish',
  gemTypeLabel: 'Gem Type',
  fittingLabel: 'Fitting',

  detailLabels: {
      title: 'Title',
      name: 'Name',
      sku: 'SKU',
      metal: 'Metal',
      alloy: 'Alloy',
      metal_colour: 'Metal Color',
      thread_type: 'Thread Type',
      fitting: 'Fitting',
      gem_type: 'Gem Type',
      gem_colour: 'Gem Color',
      gauge: 'Gauge',
      base_size: 'Base Size',
      length: 'Length',
      width: 'Width',
      height: 'Height',
      sold_as: 'Sold As',
      shipping: 'Shipping',
    },
  },
};

export const getCopy = (region: Region): CopyMap => copyByRegion[region];
