import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export const useNativeFeedback = () => {
  const triggerImpact = (style: ImpactStyle = ImpactStyle.Medium) => {
    if (Capacitor.isNativePlatform()) {
      Haptics.impact({ style });
    }
  };
  return { triggerImpact };
};
