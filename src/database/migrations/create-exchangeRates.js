'use strict';
module.exports = {
    up: async (queryInterface, Sequelize) => {
        await queryInterface.createTable('exchangerates', {
            currency: {
                type: Sequelize.STRING(5),
                primaryKey: true,
                unique: true,
                allowNull: false
            },
            rate: {
                type: Sequelize.FLOAT,
                allowNull: false
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            }
        });
        const staticRates = {
            "AED": 4.357335,
            "AFN": 91.05097,
            "ALL": 124.031256,
            "AMD": 576.996147,
            "ANG": 2.129586,
            "AOA": 741.967272,
            "ARS": 89.040672,
            "AUD": 1.627195,
            "AWG": 2.135396,
            "AZN": 2.011211,
            "BAM": 1.954415,
            "BBD": 2.395485,
            "BDT": 100.608065,
            "BGN": 1.955918,
            "BHD": 0.446904,
            "BIF": 2289.61901,
            "BMD": 1.186331,
            "BND": 1.619673,
            "BOB": 8.192193,
            "BRL": 6.253629,
            "BSD": 1.186401,
            "BTC": 0.000111,
            "BTN": 86.963206,
            "BWP": 13.636966,
            "BYN": 3.082968,
            "BYR": 23252.089426,
            "BZD": 2.391488,
            "CAD": 1.563424,
            "CDF": 2332.327223,
            "CHF": 1.077808,
            "CLF": 0.032903,
            "CLP": 907.904231,
            "CNY": 8.079503,
            "COP": 4375.355158,
            "CRC": 706.364773,
            "CUC": 1.186331,
            "CUP": 31.437774,
            "CVE": 110.625752,
            "CZK": 26.660891,
            "DJF": 210.835017,
            "DKK": 7.440657,
            "DOP": 69.459678,
            "DZD": 152.485084,
            "EGP": 18.707138,
            "ERN": 17.795022,
            "ETB": 43.297452,
            "EUR": 1,
            "FJD": 2.523921,
            "FKP": 0.922935,
            "GBP": 0.923025,
            "GEL": 3.719175,
            "GGP": 0.922935,
            "GHS": 6.868661,
            "GIP": 0.922935,
            "GMD": 61.273607,
            "GNF": 11448.094756,
            "GTQ": 9.212519,
            "GYD": 248.112001,
            "HKD": 9.194363,
            "HNL": 29.385611,
            "HRK": 7.535691,
            "HTG": 127.993012,
            "HUF": 357.421367,
            "IDR": 17725.447395,
            "ILS": 4.072141,
            "IMP": 0.922935,
            "INR": 87.069823,
            "IQD": 1411.734001,
            "IRR": 49950.470222,
            "ISK": 160.213514,
            "JEP": 0.922935,
            "JMD": 170.162064,
            "JOD": 0.841076,
            "JPY": 125.377377,
            "KES": 128.823784,
            "KGS": 93.749843,
            "KHR": 4863.957191,
            "KMF": 491.734991,
            "KPW": 1067.765034,
            "KRW": 1402.088817,
            "KWD": 0.362785,
            "KYD": 0.988651,
            "KZT": 506.543257,
            "LAK": 10825.271728,
            "LBP": 1800.274758,
            "LKR": 218.656516,
            "LRD": 236.495143,
            "LSL": 19.752634,
            "LTL": 3.502927,
            "LVL": 0.7176,
            "LYD": 1.631195,
            "MAD": 10.881624,
            "MDL": 19.73681,
            "MGA": 4548.393164,
            "MKD": 61.570422,
            "MMK": 1574.374184,
            "MNT": 3389.448208,
            "MOP": 9.470723,
            "MRO": 423.52061,
            "MUR": 47.157322,
            "MVR": 18.280915,
            "MWK": 889.141242,
            "MXN": 25.020793,
            "MYR": 4.917939,
            "MZN": 85.213817,
            "NAD": 19.75212,
            "NGN": 454.365028,
            "NIO": 41.050668,
            "NOK": 10.723247,
            "NPR": 139.14156,
            "NZD": 1.769745,
            "OMR": 0.456723,
            "PAB": 1.186401,
            "PEN": 4.234613,
            "PGK": 4.086873,
            "PHP": 57.487215,
            "PKR": 196.930799,
            "PLN": 4.447567,
            "PYG": 8252.146396,
            "QAR": 4.319135,
            "RON": 4.855769,
            "RSD": 117.577089,
            "RUB": 89.254566,
            "RWF": 1130.573532,
            "SAR": 4.44981,
            "SBD": 9.664682,
            "SCR": 21.29484,
            "SDG": 65.633787,
            "SEK": 10.40722,
            "SGD": 1.618626,
            "SHP": 0.922935,
            "SLL": 11572.660078,
            "SOS": 691.630911,
            "SRD": 8.847641,
            "STD": 24953.065221,
            "SVC": 10.381134,
            "SYP": 606.430799,
            "SZL": 19.752638,
            "THB": 37.120822,
            "TJS": 12.250131,
            "TMT": 4.164022,
            "TND": 3.242252,
            "TOP": 2.7046,
            "TRY": 8.884792,
            "TTD": 8.02372,
            "TWD": 34.696034,
            "TZS": 2752.483836,
            "UAH": 33.210654,
            "UGX": 4393.419068,
            "USD": 1.186331,
            "UYU": 50.469757,
            "UZS": 12195.48368,
            "VEF": 11.848487,
            "VND": 27493.816249,
            "VUV": 133.798805,
            "WST": 3.090825,
            "XAF": 655.46035,
            "XAG": 0.043634,
            "XAU": 0.000606,
            "XCD": 3.206119,
            "XDR": 0.840063,
            "XOF": 656.643204,
            "XPF": 119.671194,
            "YER": 296.998039,
            "ZAR": 19.778785,
            "ZMK": 10678.406735,
            "ZMW": 23.657971,
            "ZWL": 381.999005
        }
        const ratesArray = [];
        for (const currency in staticRates) {
            const rate = staticRates[currency];
            ratesArray.push({
                currency,
                rate,
                createdAt: new Date(),
                updatedAt: new Date()
            });
        }
        return queryInterface.bulkInsert('exchangerates', ratesArray);
    },
    down: (queryInterface, Sequelize) => {
        return queryInterface.dropTable('exchangerates');
    }
};