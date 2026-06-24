/** 解析仓库地址为省/市/区/详细地址（兼容无空格连续文本） */
export function parseWarehouseAddress(
  full: string,
  provinces: string[],
  cities: Record<string, string[]>,
  districts: Record<string, string[]>
): { province: string; city: string; district: string; address: string } {
  const text = String(full || '').trim()
  if (!text) {
    return { province: '', city: '', district: '', address: '' }
  }

  if (text.includes(' ')) {
    const parts = text.split(/\s+/).filter(Boolean)
    return {
      province: parts[0] || '',
      city: parts[1] || '',
      district: parts[2] || '',
      address: parts.slice(3).join(' ')
    }
  }

  let rest = text
  let province = ''
  let city = ''
  let district = ''

  const sortedProvinces = [...provinces].sort((a, b) => b.length - a.length)
  for (const p of sortedProvinces) {
    if (rest.startsWith(p)) {
      province = p
      rest = rest.slice(p.length)
      break
    }
  }

  if (province) {
    const sortedCities = [...(cities[province] || [])].sort((a, b) => b.length - a.length)
    for (const c of sortedCities) {
      if (rest.startsWith(c)) {
        city = c
        rest = rest.slice(c.length)
        break
      }
    }
  }

  if (city) {
    const sortedDistricts = [...(districts[city] || [])].sort((a, b) => b.length - a.length)
    for (const d of sortedDistricts) {
      if (rest.startsWith(d)) {
        district = d
        rest = rest.slice(d.length)
        break
      }
    }
  }

  const detail = rest.trim()
  return {
    province,
    city,
    district,
    address: detail || (!province ? text : '')
  }
}

export function formatWarehouseAddress(parts: {
  province?: string
  city?: string
  district?: string
  address?: string
}): string {
  return [parts.province, parts.city, parts.district, parts.address]
    .map(part => String(part || '').trim())
    .filter(Boolean)
    .join(' ')
}
