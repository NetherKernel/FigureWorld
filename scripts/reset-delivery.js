const mongoose = require("mongoose");

async function reset() {
  await mongoose.connect("mongodb://localhost:27017/figuresworld");
  await mongoose.connection.collection("deliveryrules").updateOne(
    {},
    {
      $set: {
        isFreeShippingActive: false,
        enableLocalDelivery: false,
        enableRegionalDelivery: false,
        pincodeRates: [],
        defaultBaseFee: 100,
      },
    }
  );
  console.log("Delivery rules reset to default baseline (base fee: ₹100, free shipping: inactive).");
  await mongoose.disconnect();
}

reset().catch(console.error);
