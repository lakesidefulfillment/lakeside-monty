module.exports = {
  CLIENT_ID: 'skp',
  CLIENT_NAME: 'Safe Kids Path',
  APPS_SCRIPT_URL: https://script.google.com/macros/s/AKfycby3e5WeJ_eQgCJ8p_eRMho7Ao07CUP8-IddUgQ2_Eb9wtVps26rrx-czpDqbTUxW5cbEQ/exec,
  ORDERS_URL: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQ8lGVg0ZElrj_y87JV8HQ_KokGhsEhyLN--ZMwcH201sID_S1E6CabWNZbbSkR2xCzLjrkWe2RMatx/pub?gid=1889515230&single=true&output=csv',
  BILLING: {
    BASE_RATE: 2.50,
    ADDITIONAL_UNIT_RATE: 0.50,
  },
  calcRate(order) {
    const qty = parseInt(order['Qty Out'] || order['Units'] || 1);
    return 2.50 + (Math.max(0, qty - 1) * 0.50);
  }
};
