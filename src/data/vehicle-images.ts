import type { ImageSourcePropType } from 'react-native';

/** Photos that shipped with the app. Used when the CRM file name matches. */
const VEHICLES: Record<string, ImageSourcePropType> = {
  'curvv.jpg': require('../../assets/images/vehicles/curvv.jpg'),
  'curvv-ice.jpg': require('../../assets/images/vehicles/curvv-ice.jpg'),
  'nexon.jpg': require('../../assets/images/vehicles/nexon.jpg'),
  'nexon-ev.jpg': require('../../assets/images/vehicles/nexon-ev.jpg'),
  'punch-ev.jpg': require('../../assets/images/vehicles/punch-ev.jpg'),
  'harrier.jpg': require('../../assets/images/vehicles/harrier.jpg'),
  'harrier-ev.jpg': require('../../assets/images/vehicles/harrier-ev.jpg'),
  'safari.jpg': require('../../assets/images/vehicles/safari.jpg'),
  'tiago.jpg': require('../../assets/images/vehicles/tiago.jpg'),
  'tiago-ev.jpg': require('../../assets/images/vehicles/tiago-ev.jpg'),
  'offers-hero.jpg': require('../../assets/images/offers-hero.jpg'),
  'refer-earn-banner.png': require('../../assets/images/refer-earn-banner.png'),
};

export function vehicleImage(fileName: string): ImageSourcePropType | null {
  return VEHICLES[fileName] ?? null;
}
