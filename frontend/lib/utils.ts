import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { sha256 } from "js-sha256"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const validateEmail = (email: string) => {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
};

export const validatePassword = (password: string) => {
  const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
  return passwordPattern.test(password);
};

export function generateSessionId(email: string, timestamp: string) {
  return sha256(`${email}-${timestamp}`);
}

export const processResponse = (response: string) => {
  const errorMatch = response.match(/\[ERROR\](.*)/);
  const pointsMatch = response.match(/\[POINTS\](.*)/);
  const outputTimeMatch = response.match(/\[OUTPUT_TIME\](.*)/);

  if (errorMatch) {
      return { mainResponse: response, points: null, outputTime: null, error: errorMatch[1] };
  }

  if (pointsMatch || outputTimeMatch) {
      const mainResponse = response.substring(0, pointsMatch?.index || outputTimeMatch?.index || response.length).trim() || " ";
      const points = pointsMatch ? pointsMatch[1] : null;
      console.log(points);
      const outputTime = outputTimeMatch ? outputTimeMatch[1] : null;
      return { mainResponse, points, outputTime };
  }
  return { mainResponse: response, points: null, outputTime: null };
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
      return (num / 1000000).toFixed(0) + 'M';
  }
  if (num >= 1000) {
      return (num / 1000).toFixed(0) + 'k';
  }
  return num.toFixed(2).toString();
};

export const isImage = (url: string) => {
  return url.endsWith(".png") || url.endsWith(".jpg") || url.endsWith(".jpeg") || url.endsWith(".gif") || url.endsWith(".webp") || url.endsWith(".svg");
};