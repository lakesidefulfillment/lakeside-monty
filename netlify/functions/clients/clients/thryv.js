module.exports = {
  CLIENT_ID: 'thryv',
  CLIENT_NAME: 'Thryv',
  APPS_SCRIPT_URL: '',
  ORDERS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRcT2liH-YDQIpCjmI2k1xydzYqD7RY5--NlacuhiK35nwqFv-r7boRyl5sOcL2ByQDGRsQbYePz0v3/pub?gid=1567180495&single=true&output=csv',
  BILLING: {
    BASE_RATE: 1.00,
    BOX_RATE: 1.50,
    BOX_THRESHOLD: 3,
    NITEBITZS_RATE: 2.00,
    NITEBITZS_THRESHOLD: 4,
    NITEBITZS_SKU: 'NITEBITZS',
  },
  calcRate(order) {
    const qty = parseInt(order['Qty Out'] || order['Units'] || 1);
    const sku = (order['SKU'] || '').toUpperCase().trim();
    const b = this.BILLING;
    if (qty >= b.NITEBITZS_THRESHOLD && sku === b.NITEBITZS_SKU) return b.NITEBITZS_RATE;
    if (qty >= b.BOX_THRESHOLD) return b.BOX_RATE;
    return b.BASE_RATE;
  }
};
