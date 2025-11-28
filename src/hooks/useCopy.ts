import { useRegion } from '../context/RegionContext';
import { getCopy } from '../lib/copy';

export const useCopy = () => {
  const region = useRegion();
  return getCopy(region);
};