require("dotenv").config();
const mongoose = require("mongoose");
const { User, Vehicle, Driver, Permit } = require("../models");

/* ── MASTER DATA ─────────────────────────────────────────── */
const VEHICLES = [
  { plate:"GJ12AB3456", type:"10W Truck",   owner:"Ramesh Transport Co.",      rcNumber:"GJ-12-2018-001", state:"Gujarat",       vahanStatus:"verified" },
  { plate:"MH04CD7890", type:"12W Trailer", owner:"Patel Logistics Pvt Ltd",   rcNumber:"MH-04-2019-234", state:"Maharashtra",   vahanStatus:"verified" },
  { plate:"RJ14EF1234", type:"6W Truck",    owner:"Singh Carriers",            rcNumber:"RJ-14-2017-567", state:"Rajasthan",     vahanStatus:"verified" },
  { plate:"TN22IJ9012", type:"10W Truck",   owner:"Vijay Transport",           rcNumber:"TN-22-2020-890", state:"Tamil Nadu",    vahanStatus:"verified" },
  { plate:"DL09KL5678", type:"14W Trailer", owner:"Delhi Freight Co.",         rcNumber:"DL-09-2021-123", state:"Delhi",         vahanStatus:"verified" },
  { plate:"KA03MN2233", type:"10W Truck",   owner:"Bangalore Goods Co.",       rcNumber:"KA-03-2019-456", state:"Karnataka",     vahanStatus:"verified" },
  { plate:"UP32PQ8877", type:"6W Truck",    owner:"Lucknow Freight",           rcNumber:"UP-32-2020-789", state:"Uttar Pradesh", vahanStatus:"verified" },
  { plate:"WB24RS5544", type:"12W Trailer", owner:"Kolkata Logistics",         rcNumber:"WB-24-2018-012", state:"West Bengal",   vahanStatus:"verified" },
  { plate:"AP11TU3322", type:"14W Trailer", owner:"Hyderabad Transport",       rcNumber:"AP-11-2021-345", state:"Andhra Pradesh",vahanStatus:"verified" },
  { plate:"HR26VW6611", type:"10W Truck",   owner:"Gurugram Carriers",         rcNumber:"HR-26-2022-678", state:"Haryana",       vahanStatus:"verified" },
  { plate:"GJ01AA1001", type:"6W Truck",    owner:"Surat Logistics",           state:"Gujarat",    vahanStatus:"verified" },
  { plate:"GJ01AA1002", type:"10W Truck",   owner:"Ahmedabad Transport",       state:"Gujarat",    vahanStatus:"verified" },
  { plate:"MH12BB2001", type:"12W Trailer", owner:"Pune Freight",              state:"Maharashtra",vahanStatus:"verified" },
  { plate:"MH12BB2002", type:"14W Trailer", owner:"Nashik Carriers",           state:"Maharashtra",vahanStatus:"verified" },
  { plate:"TN01CC3001", type:"10W Truck",   owner:"Chennai Goods",             state:"Tamil Nadu", vahanStatus:"verified" },
  { plate:"TN01CC3002", type:"6W Truck",    owner:"Coimbatore Transport",      state:"Tamil Nadu", vahanStatus:"verified" },
  { plate:"KA05DD4001", type:"12W Trailer", owner:"Mysore Logistics",          state:"Karnataka",  vahanStatus:"verified" },
  { plate:"RJ19EE5001", type:"10W Truck",   owner:"Jodhpur Freight",           state:"Rajasthan",  vahanStatus:"verified" },
  { plate:"MP09FF6001", type:"14W Trailer", owner:"Indore Carriers",           state:"Madhya Pradesh",vahanStatus:"verified" },
  { plate:"OR02GG7001", type:"6W Truck",    owner:"Bhubaneswar Transport",     state:"Odisha",     vahanStatus:"pending"  },
  { plate:"AS01HH8001", type:"10W Truck",   owner:"Guwahati Goods",            state:"Assam",      vahanStatus:"pending"  },
  { plate:"PB10II9001", type:"12W Trailer", owner:"Amritsar Freight",          state:"Punjab",     vahanStatus:"verified" },
  { plate:"CG07JJ1001", type:"10W Truck",   owner:"Raipur Transport",          state:"Chhattisgarh",vahanStatus:"verified" },
  { plate:"GJ06KK2001", type:"6W Truck",    owner:"Vadodara Carriers",         state:"Gujarat",    vahanStatus:"verified" },
  { plate:"MH31LL3001", type:"10W Truck",   owner:"Nagpur Logistics",          state:"Maharashtra",vahanStatus:"verified" },
];

const DRIVERS_RAW = [
  { name:"Ramesh Kumar",    license:"GJ01-20180023456", mobile:"+91-9876543210", status:"approved" },
  { name:"Suresh Patel",    license:"MH04-20150089012", mobile:"+91-9865432109", status:"approved" },
  { name:"Mohan Singh",     license:"RJ14-20120056789", mobile:"+91-9754321098", status:"approved" },
  { name:"Vijay Rajan",     license:"TN22-20190034567", mobile:"+91-9643210987", status:"approved" },
  { name:"Anil Kumar",      license:"DL09-20160045678", mobile:"+91-9532109876", status:"approved" },
  { name:"Pradeep Sharma",  license:"KA03-20180056789", mobile:"+91-9421098765", status:"approved" },
  { name:"Rajesh Gupta",    license:"UP32-20140067890", mobile:"+91-9310987654", status:"approved" },
  { name:"Santosh Das",     license:"WB24-20170078901", mobile:"+91-9209876543", status:"approved" },
  { name:"Venkat Rao",      license:"AP11-20190089012", mobile:"+91-9198765432", status:"approved" },
  { name:"Harish Yadav",    license:"HR26-20200090123", mobile:"+91-9087654321", status:"approved" },
  { name:"Dinesh Verma",    license:"GJ01-20210001234", mobile:"+91-8976543210", status:"approved" },
  { name:"Mahesh Patil",    license:"MH12-20160012345", mobile:"+91-8865432109", status:"approved" },
  { name:"Sunil Reddy",     license:"TN01-20180023456", mobile:"+91-8754321098", status:"approved" },
  { name:"Ashok Nair",      license:"KA05-20190034567", mobile:"+91-8643210987", status:"approved" },
  { name:"Ravi Joshi",      license:"RJ19-20150045678", mobile:"+91-8532109876", status:"approved" },
  { name:"Prakash Tiwari",  license:"MP09-20170056789", mobile:"+91-8421098765", status:"approved" },
  { name:"Ganesh Bose",     license:"WB01-20180067890", mobile:"+91-8310987654", status:"approved" },
  { name:"Sanjay Pillai",   license:"TN10-20200078901", mobile:"+91-8209876543", status:"approved" },
  { name:"Deepak Mishra",   license:"UP14-20190089012", mobile:"+91-8098765432", status:"approved" },
  { name:"Ramakrishna S",   license:"AP22-20160090123", mobile:"+91-7987654321", status:"approved" },
  { name:"Bharat Mehta",    license:"GJ06-20210101234", mobile:"+91-7876543210", status:"pending"  },
  { name:"Kishore Rao",     license:"KA08-20180112345", mobile:"+91-7765432109", status:"pending"  },
  { name:"Arjun Singh",     license:"HR29-20200123456", mobile:"+91-7654321098", status:"approved" },
  { name:"Naveen Kumar",    license:"TN07-20170134567", mobile:"+91-7543210987", status:"approved" },
  { name:"Umesh Sharma",    license:"MH31-20190145678", mobile:"+91-7432109876", status:"approved" },
];

const CARGOS = ["Steel Coils","Cotton Bales","Rice Bags","Cement","Iron Ore","Fertilizers","Chemicals","Machinery","Coal","Wheat"];
const STAGES = ["GATE_ENTRY","TARE_WEIGH","LOADING","GROSS_WEIGH","GATE_EXIT","COMPLETED"];

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Clear all collections
    await Promise.all([
      User.deleteMany({}),
      Vehicle.deleteMany({}),
      Driver.deleteMany({}),
      Permit.deleteMany({}),
    ]);
    console.log("🗑️  Cleared existing data");

    // Create users
    const admin = await User.create({ name:"DPA Admin",        email:"admin@dpa.gov.in",  password:"Admin@123",  role:"ADMIN" });
    const cha   = await User.create({ name:"CHA Operator",     email:"cha@dpa.gov.in",    password:"Cha@1234",   role:"CHA"   });
    const gate  = await User.create({ name:"Gate Operator",    email:"gate@dpa.gov.in",   password:"Gate@1234",  role:"GATE_OPERATOR" });
    const weigh = await User.create({ name:"Weighbridge Op",   email:"weigh@dpa.gov.in",  password:"Weigh@1234", role:"WEIGHBRIDGE_OPERATOR" });
    console.log("👥 4 users created");

    // Create vehicles (one by one to trigger pre-save hooks correctly)
    const vehicles = [];
    for (const v of VEHICLES) {
      const doc = await Vehicle.create({ ...v, createdBy: admin._id });
      vehicles.push(doc);
    }
    console.log(`🚛 ${vehicles.length} vehicles created`);

    // Create drivers
    const drivers = [];
    for (const d of DRIVERS_RAW) {
      const doc = await Driver.create({
        name: d.name, license: d.license, mobile: d.mobile,
        status: d.status,
        approvedBy: d.status === "approved" ? admin._id : undefined,
        approvedAt: d.status === "approved" ? new Date() : undefined,
        createdBy: admin._id,
      });
      drivers.push(doc);
    }
    console.log(`👤 ${drivers.length} drivers created`);

    // Create 30 permits across all stages
    const approvedDrivers  = drivers.filter(d => d.status === "approved");
    const verifiedVehicles = vehicles.filter(v => v.vahanStatus === "verified");

    for (let i = 0; i < 30; i++) {
      const v     = verifiedVehicles[i % verifiedVehicles.length];
      const d     = approvedDrivers[i % approvedDrivers.length];
      const stage = STAGES[i % STAGES.length];
      const base  = 7000 + (i * 100);
      const tare  = stage !== "GATE_ENTRY" ? base : null;
      const gross = ["GROSS_WEIGH","GATE_EXIT","COMPLETED"].includes(stage) ? base + 12000 + (i * 200) : null;

      await Permit.create({
        vcn:            `VCN-${String(4500 + i).padStart(4,"0")}`,
        igmLine:        `IGM-LINE-${String(i + 1).padStart(2,"0")}`,
        vehicle:        v._id,
        driver:         d._id,
        cargo:          CARGOS[i % CARGOS.length],
        declaredWeight: 12000 + (i * 300),
        chaId:          cha._id,
        stage,
        stageHistory:   [{ stage, enteredAt: new Date(Date.now() - i * 3600000), operator: gate._id }],
        paymentStatus:  "cleared",
        tareWeight:     tare,
        grossWeight:    gross,
        netWeight:      gross && tare ? gross - tare : null,
        gateEntryAt:    stage !== "GATE_ENTRY" ? new Date(Date.now() - i * 3600000) : null,
        completedAt:    stage === "COMPLETED"  ? new Date(Date.now() - i * 1800000) : null,
      });
    }
    console.log("📋 30 permits created across all stages");

    console.log("\n🎉 Seed complete!\n");
    console.log("────────────────────────────────────────");
    console.log("  Role          Email                 Password");
    console.log("────────────────────────────────────────");
    console.log("  Admin         admin@dpa.gov.in      Admin@123");
    console.log("  CHA           cha@dpa.gov.in        Cha@1234");
    console.log("  Gate Op       gate@dpa.gov.in       Gate@1234");
    console.log("  Weighbridge   weigh@dpa.gov.in      Weigh@1234");
    console.log("────────────────────────────────────────\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seed();
