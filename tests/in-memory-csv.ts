function escapeField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}

export const inMemoryCSV = (headers: string[], rows: string[][]) => {
  const csv = [headers, ...rows].map(row => row.map(escapeField).join(',')).join('\n')

  return Buffer.from(csv)
}
