import { createContext } from 'svelte';
import type { YouTubePlayerContext, YouTubeSliderContext } from './types';

export const [getYtContext, setYtContext] = createContext<YouTubePlayerContext>();
export const [getSliderContext, setSliderContext] = createContext<YouTubeSliderContext>();
