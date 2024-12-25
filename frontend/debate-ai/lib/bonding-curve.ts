export function calculateInitialBond(timeLimitInMinutes: number): number {
  // This is a simple linear bonding curve. You might want to use a more sophisticated curve in a real application.
  const baseBond = 100 // Base bond in your chosen currency (e.g., USD)
  const bondPerMinute = 0.1 // Additional bond per minute
  return baseBond + timeLimitInMinutes * bondPerMinute
}

export function calculateCurrentPrice(timePassed: number, totalTime: number, initialBond: number): number {
  // This is a simple quadratic bonding curve. Adjust as needed for your specific use case.
  const progress = timePassed / totalTime
  return initialBond * (1 + progress * progress)
}

