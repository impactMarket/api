import { Sequelize, DataTypes, Model } from 'sequelize';


export class Transactions extends Model {
    public tx!: string; // Note that the `null assertion` `!` is required in strict mode.
    public from!: string;
    public contractAddress!: string;
    public event!: string;
    public values!: any;

    // timestamps!
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initializeTransactions(sequelize: Sequelize) {
    return Transactions.init({
        uid: {
            type: DataTypes.STRING(64),
            primaryKey: true,
            unique: true,
        },
        tx: {
            type: DataTypes.STRING(68),
            allowNull: false,
        },
        from: {
            type: DataTypes.STRING(44),
            allowNull: false,
        },
        contractAddress: {
            type: DataTypes.STRING(44),
            allowNull: false,
        },
        event: {
            type: DataTypes.STRING(64),
            allowNull: false,
        },
        values: {
            type: DataTypes.JSONB,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
        }
    }, {
        tableName: 'transactions',
        sequelize: sequelize, // this bit is important
    });
}