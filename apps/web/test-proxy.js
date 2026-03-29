fetch('http://localhost:3000/api/proxy/admin/offline-order-products')
  .then(r => {
    console.log("Status:", r.status);
    return r.text();
  })
  .then(text => console.log("Body:", text))
  .catch(console.error);
