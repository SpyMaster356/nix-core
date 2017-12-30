const {findRole, PermissionsManager} = require('../utility');

module.exports = {
  name: 'rmRole',
  run: (context, response) => {
    let guild = context.guild;
    let roleString = context.args.input1;
    let level = context.args.input2;

    let role = findRole(roleString, context);
    if (!role) {
      response.content = `Role ${roleString} could not be found.`;
      return response.send();
    }

    return context.nix.permissionsManager
      .removeRole(guild, level, role)
      .map((saved) => {
        if (saved) {
          response.content = `Removed ${role} from ${level}`;
        }
        else {
          response.content = `Unable to update permissions`;
        }

        return response.send();
      })
      .catch((error) => {
        if (error.message === PermissionsManager.ERR_LEVEL_NOT_FOUND) {
          response.content = `Level ${level} is not available.`;
          return response.send();
        }
        else if (error.message === PermissionsManager.ERR_MISSING_PERMISSION) {
          response.content = `${role} is not in ${level}`;
          return response.send();
        }

        throw error;
      });
  },
};