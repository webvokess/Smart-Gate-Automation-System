const { Permit, Vehicle, Driver, AuditLog } = require("../models");

exports.getStats = async (req, res, next) => {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);

    const [
      totalToday, insideDock, alerts, vehicles, drivers, completed, weeklyData, stageData, hourlyData, recentPermits,
    ] = await Promise.all([
      Permit.countDocuments({ createdAt: { $gte: today, $lte: todayEnd } }),
      Permit.countDocuments({ stage: { $nin: ["COMPLETED"] } }),
      Permit.countDocuments({ "alerts.0": { $exists: true }, stage: { $ne: "COMPLETED" } }),
      Vehicle.countDocuments({ deletedAt: null }),
      Driver.countDocuments({ deletedAt: null, status: "approved" }),
      Permit.countDocuments({ stage: "COMPLETED", completedAt: { $gte: today } }),

      // Weekly (last 7 days)
      Permit.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 7*24*3600*1000) } } },
        { $group: { _id: { $dayOfWeek: "$createdAt" }, count: { $sum: 1 }, flagged: { $sum: { $cond: [{ $gt: [{ $size: "$alerts" }, 0] }, 1, 0] } } } },
        { $sort: { "_id": 1 } },
      ]),

      // Stage distribution
      Permit.aggregate([
        { $match: { stage: { $ne: "COMPLETED" } } },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
      ]),

      // Hourly throughput (today)
      Permit.aggregate([
        { $match: { createdAt: { $gte: today, $lte: todayEnd } } },
        { $group: { _id: { $hour: "$createdAt" }, count: { $sum: 1 } } },
        { $sort: { "_id": 1 } },
      ]),

      // Recent permits
      Permit.find().populate("vehicle driver", "plate name").sort("-createdAt").limit(10),
    ]);

    // Avg turnaround (completed today)
    const completedWithTime = await Permit.find({ stage:"COMPLETED", completedAt:{ $gte: today } }).select("gateEntryAt completedAt");
    const avgTurnaround = completedWithTime.length
      ? completedWithTime.reduce((acc, p) => acc + (p.completedAt - p.gateEntryAt), 0) / completedWithTime.length / 60000
      : 0;

    const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
    res.json({
      success: true,
      data: {
        stats: { totalToday, insideDock, alerts, vehicles, drivers, completed, avgTurnaround: avgTurnaround.toFixed(1) },
        weekly: weeklyData.map(d => ({ day: days[d._id-1], permits: d.count, flagged: d.flagged })),
        stages: stageData.map(d => ({ name: d._id, value: d.count })),
        hourly: hourlyData.map(d => ({ h: `${d._id}h`, v: d.count })),
        recentPermits,
      },
    });
  } catch (err) { next(err); }
};
