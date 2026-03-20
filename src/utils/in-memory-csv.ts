export const inMemoryCSV = (headers: string[], rows: string[][]) => {
  const csv = [headers, ...rows].map(row => row.join(',')).join('\n')

  return Buffer.from(csv)
}
