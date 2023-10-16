"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CAMERA_FOV_COEFFS = exports.CAMERAS = void 0;
exports.CAMERAS = [
    {
        start: {
            position: new Float32Array([-180.70840454101562, 344.12786865234375, 464.48724365234375]),
            rotation: new Float32Array([1.0439989566802979, 2.0820043087005615, 0])
        },
        end: {
            position: new Float32Array([-112.06977844238281, -171.38133239746094, 366.0000305175781]),
            rotation: new Float32Array([1.031998872756958, 0.6360000967979431, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-65.85258483886719, -533.7212524414062, 97.40440368652344]),
            rotation: new Float32Array([0.12599997222423553, 0.1620001345872879, 0])
        },
        end: {
            position: new Float32Array([33.180965423583984, 144.239501953125, 41.7051887512207]),
            rotation: new Float32Array([0.12599997222423553, 0.1620001345872879, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([372.5055236816406, 88.55387115478516, 69.73857879638672]),
            rotation: new Float32Array([0.06599999964237213, 4.801174163818359, 0])
        },
        end: {
            position: new Float32Array([-65.18380737304688, 126.53640747070312, 42.17599105834961]),
            rotation: new Float32Array([0.03599999472498894, 4.77117395401001, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([131.52081298828125, 301.15557861328125, 130.46836853027344]),
            rotation: new Float32Array([0.7680003643035889, 3.9600257873535156, 0])
        },
        end: {
            position: new Float32Array([206.39492797851562, -6.715636253356934, 139.7966766357422]),
            rotation: new Float32Array([1.0679999589920044, 4.710031032562256, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([202.11294555664062, -170.178466796875, 58.734954833984375]),
            rotation: new Float32Array([0.24599967896938324, 6.007182598114014, 0])
        },
        end: {
            position: new Float32Array([128.2172393798828, 107.47187805175781, 134.7461700439453]),
            rotation: new Float32Array([0.7979993224143982, 5.935182094573975, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([279.81304931640625, 664.1943359375, 275.15228271484375]),
            rotation: new Float32Array([0.3720014989376068, 3.6517090797424316, 0])
        },
        end: {
            position: new Float32Array([-17.399612426757812, 47.14397048950195, 86.219970703125]),
            rotation: new Float32Array([0.3240014612674713, 4.449714660644531, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-195.9441680908203, 700.3867797851562, 418.3968811035156]),
            rotation: new Float32Array([0.6000023484230042, 2.7540125846862793, 0])
        },
        end: {
            position: new Float32Array([1.8704317808151245, 160.99075317382812, 147.00608825683594]),
            rotation: new Float32Array([0.26400214433670044, 2.994014263153076, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-248.67987060546875, -320.5169982910156, 593.5792236328125]),
            rotation: new Float32Array([0.7679989337921143, 0.48600319027900696, 0])
        },
        end: {
            position: new Float32Array([-151.6046142578125, 290.5845947265625, 197.34095764160156]),
            rotation: new Float32Array([0.7859989404678345, 2.172008752822876, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-90.51039123535156, 348.780517578125, 67.15997314453125]),
            rotation: new Float32Array([0.11399991810321808, 2.863162040710449, 0])
        },
        end: {
            position: new Float32Array([-27.74077606201172, 119.6170883178711, 377.1683654785156]),
            rotation: new Float32Array([1.169999599456787, 2.9051623344421387, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([82.28939056396484, 445.0611572265625, 93.37278747558594]),
            rotation: new Float32Array([0.17400018870830536, 3.3000097274780273, 0])
        },
        end: {
            position: new Float32Array([16.53315544128418, 33.45115661621094, 35.45589065551758]),
            rotation: new Float32Array([0.17400018870830536, 3.3000097274780273, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([78.29499816894531, -17.22335433959961, 70.7376480102539]),
            rotation: new Float32Array([0.6720003485679626, 3.480013608932495, 0])
        },
        end: {
            position: new Float32Array([78.29499816894531, -17.22335433959961, 70.7376480102539]),
            rotation: new Float32Array([0.3780005872249603, 5.832029819488525, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-146.90318298339844, 142.15151977539062, 66.49613952636719]),
            rotation: new Float32Array([0.47400030493736267, 0.9359981417655945, 0])
        },
        end: {
            position: new Float32Array([-17.769685745239258, 261.3605651855469, 81.00308990478516]),
            rotation: new Float32Array([1.007999062538147, 3.918010950088501, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([156.03762817382812, 195.03221130371094, 66.18341827392578]),
            rotation: new Float32Array([0.3479999899864197, 4.95717716217041, 0])
        },
        end: {
            position: new Float32Array([14.030660629272461, 225.5084686279297, 24.763769149780273]),
            rotation: new Float32Array([0.22799980640411377, 4.735175609588623, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([33.84556579589844, 167.5606231689453, 66.10122680664062]),
            rotation: new Float32Array([1.0499999523162842, 2.8188557624816895, 0])
        },
        end: {
            position: new Float32Array([45.27586364746094, 158.3726348876953, 31.550251007080078]),
            rotation: new Float32Array([0.6780003309249878, 3.244858741760254, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([36.692195892333984, 120.5238265991211, 10.132575035095215]),
            rotation: new Float32Array([0.0299999937415123, 4.801177501678467, 0])
        },
        end: {
            position: new Float32Array([-41.80580520629883, 171.68023681640625, 30.876060485839844]),
            rotation: new Float32Array([0.5100004076957703, 3.319167137145996, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([7.791806697845459, 136.1355743408203, 41.7769889831543]),
            rotation: new Float32Array([0.6599994897842407, 4.5300211906433105, 0])
        },
        end: {
            position: new Float32Array([-62.04362106323242, 219.46224975585938, 69.3672866821289]),
            rotation: new Float32Array([0.7379992604255676, 3.2460103034973145, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-212.7830047607422, 26.864469528198242, 47.52628707885742]),
            rotation: new Float32Array([0.4740002751350403, 1.2131590843200684, 0])
        },
        end: {
            position: new Float32Array([-106.01717376708984, 104.0726318359375, 52.95517349243164]),
            rotation: new Float32Array([0.6719997525215149, 5.924343585968018 - 6.28, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-202.10008239746094, 240.60462951660156, 100.6684799194336]),
            rotation: new Float32Array([1.1399996280670166, 2.718008041381836, 0])
        },
        end: {
            position: new Float32Array([-47.3318977355957, 94.16532135009766, 91.72081756591797]),
            rotation: new Float32Array([0.6600000262260437, 1.4159926176071167, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-298.9365539550781, 133.06166076660156, 16.645557403564453]),
            rotation: new Float32Array([0.0660000592470169, 1.5480033159255981, 0])
        },
        end: {
            position: new Float32Array([-249.6297149658203, -25.413482666015625, 51.728633880615234]),
            rotation: new Float32Array([0.3420001268386841, 0.7860006093978882, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-541.5399169921875, -31.938264846801758, 14.510990142822266]),
            rotation: new Float32Array([0.01799987070262432, 1.2720028162002563, 0])
        },
        end: {
            position: new Float32Array([-168.18260192871094, 114.04676055908203, 50.46665954589844]),
            rotation: new Float32Array([0.5580002069473267, 1.368003487586975, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-86.40751647949219, -398.1352233886719, 13.765576362609863]),
            rotation: new Float32Array([-0.2579997777938843, 0.030000174418091774, 0])
        },
        end: {
            position: new Float32Array([-124.21296691894531, 103.60616302490234, 182.36685180664062]),
            rotation: new Float32Array([0.893999457359314, 1.386001706123352, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-112.36286163330078, -105.78300476074219, 156.2106170654297]),
            rotation: new Float32Array([0.9179993271827698, 1.4820020198822021, 0])
        },
        end: {
            position: new Float32Array([10.100805282592773, -152.53306579589844, 56.91889953613281]),
            rotation: new Float32Array([0.6060008406639099, 0.5040009617805481, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([91.12299346923828, -164.51905822753906, 40]),
            rotation: new Float32Array([0.4319993853569031, 5.587181568145752 - 6.28, 0])
        },
        end: {
            position: new Float32Array([-84.89698028564453, -186.57069396972656, 94.95513153076172]),
            rotation: new Float32Array([0.6240002512931824, 0.8039996027946472, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([46.48644256591797, -247.68185424804688, 136.48138427734375]),
            rotation: new Float32Array([0.49200037121772766, 5.911182880401611, 0])
        },
        end: {
            position: new Float32Array([135.65267944335938, 292.2001037597656, 66.20657348632812]),
            rotation: new Float32Array([0.1560002565383911, 3.877168655395508, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([-185.5640869140625, 275.6010437011719, 99.46765899658203]),
            rotation: new Float32Array([0.35999998450279236, 1.950005054473877, 0])
        },
        end: {
            position: new Float32Array([-187.9376983642578, -36.43680191040039, 91.44284057617188]),
            rotation: new Float32Array([0.2819998264312744, 0.8999989628791809, 0])
        },
        speedMultiplier: 1.0
    },
    {
        start: {
            position: new Float32Array([77.51092529296875, -15.743629455566406, 185.93775939941406]),
            rotation: new Float32Array([0.5579999685287476, 5.995182514190674, 0])
        },
        end: {
            position: new Float32Array([126.171142578125, 377.15887451171875, 139.98440551757812]),
            rotation: new Float32Array([0.504000186920166, 3.6491665840148926, 0])
        },
        speedMultiplier: 1.0
    }
];
exports.CAMERA_FOV_COEFFS = [
    1.0,
    1.0,
    1.0,
    0.5,
    0.8,
    1.0,
    1.0,
    1.0,
    0.9,
    0.8,
    0.5,
    0.4,
    0.5,
    0.3,
    0.3,
    0.3,
    0.5,
    0.6,
    0.7,
    0.7,
    1.0,
    0.6,
    0.6,
    1.0,
    0.9,
    1.0 // 25
];
const logCameras = () => {
    let result = "";
    for (const camera of exports.CAMERAS) {
        result += `
        new CameraPositionPair() {{
            start = new CameraPosition() {{
                position = new Point3D(${camera.start.position});
                rotation = new Point3D(${camera.start.rotation});
            }};
            end = new CameraPosition() {{
                position = new Point3D(${camera.end.position});
                rotation = new Point3D(${camera.end.rotation});
            }};
            speedMultiplier = ${camera.speedMultiplier}f;
        }},
        `;
    }
    return result;
};
window.camerasString = logCameras();
//# sourceMappingURL=Cameras.js.map