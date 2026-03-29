require('dotenv').config();
const { listAllProducts } = require('./src/controllers/offlineOrderProductController');
const req = {};
const res = {
  json: (data) => console.log("SUCCESS length:", data.data.length),
  status: (code) => { console.log("STATUS:", code); return { json: console.log }; }
};
const next = (err) => console.log("NEXT ERROR:", err);

listAllProducts(req, res, next).catch(e => console.error("FATAL:", e));
