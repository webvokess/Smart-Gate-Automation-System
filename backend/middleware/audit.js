const { AuditLog } = require("../models");

const audit = (action, resource) => async (req, res, next) => {
  const original = res.json.bind(res);
  res.json = async (body) => {
    if (body?.success !== false) {
      try {
        await AuditLog.create({
          userId: req.user?._id,
          userName: req.user?.name,
          action,
          resource,
          resourceId: body?.data?._id || req.params?.id,
          details: { method: req.method, body: req.body },
          ip: req.ip,
        });
      } catch (_) {}
    }
    return original(body);
  };
  next();
};

module.exports = { audit };
