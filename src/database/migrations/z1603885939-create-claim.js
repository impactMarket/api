'use strict';

// eslint-disable-next-line no-undef
module.exports = {
    up(queryInterface, Sequelize) {
        return queryInterface.createTable('claim', {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
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
                onDelete: 'CASCADE',
                allowNull: false,
            },
            amount: {
                // https://github.com/sequelize/sequelize/blob/2874c54915b2594225e939809ca9f8200b94f454/lib/dialects/postgres/data-types.js#L102
                type: Sequelize.DECIMAL(24), // max 999,999 - plus 18 decimals
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
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
            },
        });
    },
    down: (queryInterface) => {
        return queryInterface.dropTable('claim');
    },
};
