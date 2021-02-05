'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await  queryInterface.createTable('beneficiary', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            address: {
                type: Sequelize.STRING(44),
                allowNull: false,
            },
            communityId: {
                type: Sequelize.UUID,
                references: {
                    model: 'community',
                    key: 'publicId',
                },
                onDelete: 'RESTRICT',
                allowNull: false
            },
            active: {
                type: Sequelize.BOOLEAN,
                defaultValue: true,
                allowNull: false,
            },
            tx: {
                type: Sequelize.STRING(68),
                unique: true,
                allowNull: false,
            },
            txAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },
            claims: {
                type: Sequelize.INTEGER,
                defaultValue: 0,
                allowNull: false,
            },
            lastClaimAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            penultimateClaimAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            }
        });
        return queryInterface.sequelize.query(`ALTER TABLE beneficiary ADD CONSTRAINT one_beneficiary_per_community_key UNIQUE (address, "communityId");`)
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('beneficiary');
    }
};