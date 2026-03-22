export default {
  name: 'price-filter',
  type: 'filter',
  version: '1.0.0',
  
  async execute(context) {
    const { data, minPrice = 0, maxPrice = Infinity } = context

    if (!Array.isArray(data)) {
      return data
    }

    return data.filter(item => {
      const priceStr = item.price || item.cost || ''
      const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''))

      if (isNaN(price)) return true

      return price >= minPrice && price <= maxPrice
    })
  }
}
