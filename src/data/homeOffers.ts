import type { ImageSourcePropType } from 'react-native';

export type HomeOffer = {
  id: string;
  accentLabel: string;
  promoTitle: string;
  validNote: string;
  image: ImageSourcePropType;
};

export const REFER_BANNER = require('../../assets/images/refer-earn-banner.png');
