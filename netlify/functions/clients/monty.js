module.exports = {
  CLIENT_ID: 'monty',
  CLIENT_NAME: 'Monty Supplements',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwQP-IrLKgaoNbU7nQFMoQ1fMnAw70JaQdklbw20ZLVm1oAVBpIdY-NfgcTcHFKEGGN2w/exec',
  ORDERS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR6J6k1mNgNeyCPtP-f30ARDrGVNUEBc-vLhhNSORj1lqT-G-k69ixZS58teHi6czLEJxJiyuiQWmHa/pub?gid=205851154&single=true&output=csv',
  BILLING: {
    BASE_RATE: 1.00,
    PREMIUM_RATE: 1.36,
    PREMIUM_UNIT_THRESHOLD: 3,
    PREMIUM_SKUS: ['TDS'],
  },
  calcRate(order) {
    const qty = parseInt(order['Qty Out'] || order['Units'] || 1);
    const sku = (order['SKU'] || '').toUpperCase();
    if (this.BILLING.PREMIUM_SKUS.includes(sku)) return this.BILLING.PREMIUM_RATE;
    if (qty >= this.BILLING.PREMIUM_UNIT_THRESHOLD) return this.BILLING.PREMIUM_RATE;
    return this.BILLING.BASE_RATE;
  }
};
