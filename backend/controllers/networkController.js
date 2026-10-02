const User = require('../models/User');
const { buildUserNetworkGraph } = require('../services/networkService');

exports.getNetworkGraph = async (req, res) => {
  try {
    const userId = req.user ? req.user._id : (await User.findOne().sort({ createdAt: -1 }))._id;
    const graphData = await buildUserNetworkGraph(userId);
    res.status(200).json({ success: true, data: graphData });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
