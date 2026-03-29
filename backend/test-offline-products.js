const { listAllProducts } = require('./src/controllers/offlineOrderProductController');
const req = {};
const res = {
  json: (data) => console.log("SUCCESS:", JSON.stringify(data, null, 2).slice(0, 500)),
  status: (code) => { console.log("STATUS:", code); return res; }
};
const next = (err) => console.log("NEXT ERROR:", err);

listAllProducts(req, res, next).catch(e => console.error("FATAL:", e));
