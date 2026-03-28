module.exports = {
  CLIENT_ID: 'gleaux',
  CLIENT_NAME: 'Gleaux',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwRtLYMESTZw_X0mked6MIMrfmo6EPp9BUukUEe6eB8mU5Vr1spmkoKr8R9HZT2heZW/exec',
  ORDERS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSNNriO9Jp9BPC0ISMktVkH1X-j6HjGKexyVgb1st6aeWcpsKpxsrMZQm7cSFWKk8_crwopop4-ukbV/pub?gid=1889515230&single=true&output=csv',
  BILLING: {
    RATE_1PACK: 1.30,
    RATE_2PACK: 1.80,
    RATE_3PACK: 3.00,
  },
  calcRate(order) {
    const qty = parseInt(order['Qty Out'] || order['Units'] || 1);
    if (qty >= 3) return this.BILLING.RATE_3PACK;
    if (qty === 2) return this.BILLING.RATE_2PACK;
    return this.BILLING.RATE_1PACK;
  }
};
