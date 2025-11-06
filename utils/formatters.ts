export const formatNumber = (value: any): string => {
  if (value === null || value === undefined) {
    return '';
  }
  
  const num = Number(value);

  if (isNaN(num)) {
      // If it's not a number but a string, return as is.
      return String(value);
  }

  // Use Intl.NumberFormat for compact notation
  try {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      compactDisplay: 'short',
      maximumFractionDigits: 2
    }).format(num);
  } catch (e) {
    // Fallback for very large numbers that might exceed Intl.NumberFormat limits
    return String(value);
  }
};
