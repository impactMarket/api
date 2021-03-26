import { Sequelize } from 'sequelize';

export function userAssociation(sequelize: Sequelize) {
    // used to query from the user with incude
    sequelize.models.UserModel.hasMany(sequelize.models.Beneficiary, {
        foreignKey: 'address',
        as: 'beneficiary',
    });
    // used to query from the beneficiary with incude
    sequelize.models.Beneficiary.belongsTo(sequelize.models.UserModel, {
        foreignKey: 'address',
        as: 'user',
    });

    // used to query from the user with incude
    sequelize.models.UserModel.hasMany(sequelize.models.Manager, {
        foreignKey: 'user',
        as: 'manager',
    });

    // used to query from the user with incude
    sequelize.models.UserModel.belongsToMany(
        sequelize.models.AppUserTrustModel,
        {
            through: sequelize.models.AppUserThroughTrustModel,
            foreignKey: 'userAddress',
            sourceKey: 'address',
            as: 'throughTrust',
        }
    );
    // used to query from the AppUserTrust with incude
    sequelize.models.AppUserTrustModel.belongsToMany(
        sequelize.models.UserModel,
        {
            through: sequelize.models.AppUserThroughTrustModel,
            foreignKey: 'appUserTrustId',
            sourceKey: 'id',
            as: 'throughTrust',
        }
    );
    // self association to find repeated values on those keys
    sequelize.models.AppUserTrustModel.hasMany(
        sequelize.models.AppUserTrustModel,
        {
            foreignKey: 'phone',
            sourceKey: 'phone',
            as: 'selfTrust',
        }
    );

    // beneficiaries are linked to manager through communityId
    sequelize.models.Beneficiary.belongsTo(sequelize.models.Manager, {
        foreignKey: 'communityId',
        targetKey: 'communityId',
        as: 'manager',
    });
}