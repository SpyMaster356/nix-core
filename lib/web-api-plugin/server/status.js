const express = require('express');
const router = express.Router();

router.get('/status', async (req, res, next) => {
  try {
    const botName = req.chaos.discord.user.username;

    const plugins = req.chaos.pluginManager.plugins.map((plugin) => ({
      name: plugin.name,
    }));

    res.send({
      listening: true,
      botName,
      plugins,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;