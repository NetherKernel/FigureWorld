const mongoose = require("mongoose");

async function reset() {
  await mongoose.connect("mongodb://localhost:27017/figuresworld");
  await mongoose.connection.collection("deliveryrules").updateOne(
    {},
    {
      $set: {
        lightWeightFee: 180,
        largeWeightFee: 299,
        heavyWeightThresholdKg: 2.0,
        defaultBaseFee: 180,
        nationalFee: 180,
        isFreeShippingActive: false,
        enableLocalDelivery: false,
        enableRegionalDelivery: false,
        heavyItemSurcharge: 0,
        pincodeRates: [],
      },
      $unset: {
        stateRates: "",
      },
    }
  );
  console.log("Delivery rules updated to two-tier weight pricing (Light ₹180, Large ₹299, State rates purged).");
  await mongoose.disconnect();
}

reset().catch(console.error);

