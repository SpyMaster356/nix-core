const {findUser, PermissionsManager} = require('../utility');

module.exports = {
  name: 'addUser',
  inputs: [
    {
      name: "user",
      description: "the user to grant a permission level to",
      required: true,
    },
    {
      name: "level",
      description: "the permission level to grant",
      required: true,
    },
  ],

  run: (context, response) => {
    let guild = context.guild;
    let userString = context.args.input1;
    let level = context.args.input2;

    let user = findUser(userString, context);
    if (!user) {
      response.content = `User ${userString} could not be found.`;
      return response.send();
    }

    return context.nix.permissionsManager
      .addUser(guild, level, user)
      .map((saved) => {
        if (saved) {
          response.content = `Added ${user} to ${level}`;
        }
        else {
          response.content = `Unable to update permissions`;
        }

        return response.send();
      })
      .catch((error) => {
        if (error.message === PermissionsManager.ERR_LEVEL_NOT_FOUND) {
          response.content = `Permission level ${level} is not available.`;
          return response.send();
        }
        else if (error.message === PermissionsManager.ERR_HAS_PERMISSION) {
          response.content = `${user} already has ${level}`;
          return response.send();
        }

        throw error;
      });
  },
};