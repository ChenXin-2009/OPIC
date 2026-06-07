/**
 * Loading utilities module
 * 
 * Provides resource preloading functionality for optimizing initial load times.
 */

export {
  ResourcePreloader,
  getPreloader,
  resetPreloader,
  ResourceType,
} from './preloader';

export type {
  Resource,
  PreloadConfig,
  PreloadProgress,
} from './preloader';
