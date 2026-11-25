// Map geometry for each level: roads, leylines and foundations. setMapLevel swaps the live bindings.
// Logical map size is 1600 × 1000 (an open two-page spread, gutter at x = 800).
import type { LaneId, LevelId } from './balance';

export interface Vec { x: number; y: number }
export const MAP_W = 1600;
export const MAP_H = 1000;
export const GUTTER_X = 800;

export interface LevelGeometry {
  junction: Vec;
  gate: Vec;
  /** A point on the King's lane where the dogs are announced (the bridge, or the stable yard). */
  choke: Vec;
  inkwell: Vec;
  castle: Vec;
  mill: Vec;
  pond: Vec;
  river: Vec[];
  laneNames: Record<LaneId, string>;
  millPts: Vec[];
  kingPts: Vec[];
  leyNodes: LeyNode[];
}

// ── Level 1: the fields before Goosebridge ─────────────────────────────────
const F_JUNCTION: Vec = { x: 1290, y: 520 };
const F_GATE: Vec = { x: 1452, y: 520 };
const F_BRIDGE: Vec = { x: 870, y: 765 };
const F_INKWELL: Vec = { x: 1488, y: 806 };
/** Leyline tree of the fields: rooted at the inkwell, leaves are tower foundations. */
const FIELDS_LEY: LeyNode[] = [
  { id: 'ink', x: F_INKWELL.x - 34, y: F_INKWELL.y - 8 },
  { id: 't0', x: 1395, y: 792, parent: 'ink', bow: 6 },
  // Wallward: north along the walls, then west along the top of the map
  { id: 'w1', x: 1405, y: 612, parent: 't0', bow: -10 },
  { id: 'f_gate', x: 1330, y: 662, parent: 'w1', bow: 6, foundation: { name: 'Gate Garden' } },
  { id: 'w2', x: 1398, y: 440, parent: 'w1', bow: 10 },
  { id: 'f_watch', x: 1300, y: 418, parent: 'w2', bow: -6, foundation: { name: 'Watch Hill' } },
  { id: 'w3', x: 1190, y: 318, parent: 'w2', bow: -14 },
  { id: 'f_upper', x: 1062, y: 318, parent: 'w3', bow: 8, foundation: { name: 'Upper Field' } },
  { id: 'w4', x: 940, y: 226, parent: 'w3', bow: 12 },
  { id: 'f_millhill', x: 712, y: 132, parent: 'w4', bow: -10, foundation: { name: 'Windy Hill' } },
  // Crossroads: the hub south-west of the castle
  { id: 'c1', x: 1250, y: 735, parent: 't0', bow: -8 },
  { id: 'f_junction', x: 1172, y: 532, parent: 'c1', bow: 14, foundation: { name: 'The Crossroads' } },
  { id: 'f_east', x: 1112, y: 812, parent: 'c1', bow: -8, foundation: { name: 'East Bank' } },
  // Fenward: low along the bottom page
  { id: 'c3', x: 985, y: 845, parent: 'c1', bow: 10 },
  { id: 'c5', x: 812, y: 925, parent: 'c3', bow: -10 },
  { id: 'f_fen', x: 705, y: 962, parent: 'c5', bow: 6, foundation: { name: 'Fen Gate' } },
  { id: 'c6', x: 640, y: 790, parent: 'c5', bow: 14 },
  { id: 'f_ford', x: 530, y: 852, parent: 'c6', bow: -8, foundation: { name: 'Ford Meadow' } },
  // Heartwood: through the middle to the mill and the far west
  { id: 'p1', x: 1060, y: 562, parent: 'c1', bow: 10 },
  { id: 'f_bridge', x: 985, y: 625, parent: 'p1', bow: 6, foundation: { name: 'Goosebridge' } },
  { id: 'p2', x: 880, y: 560, parent: 'p1', bow: -8 },
  { id: 'f_bend', x: 838, y: 478, parent: 'p2', bow: 6, foundation: { name: 'Spring Bend' } },
  { id: 'p3', x: 735, y: 700, parent: 'p2', bow: 12 },
  { id: 'p4', x: 470, y: 600, parent: 'p3', bow: -14 },
  { id: 'f_mill', x: 560, y: 340, parent: 'p4', bow: 14, foundation: { name: 'Mill Yard' } },
  { id: 'p5', x: 320, y: 470, parent: 'p4', bow: 10 },
  { id: 'f_millgate', x: 300, y: 300, parent: 'p5', bow: -10, foundation: { name: 'Millgate Knoll' } },
  { id: 'f_hollow', x: 150, y: 262, parent: 'p5', bow: 12, foundation: { name: 'Hollow Oak' } },
];
const FIELDS_GEO: LevelGeometry = {
  junction: F_JUNCTION, gate: F_GATE, choke: F_BRIDGE, inkwell: F_INKWELL,
  castle: { x: 1520, y: 520 }, mill: { x: 520, y: 112 }, pond: { x: 640, y: 505 },
  river: [{ x: 676, y: 548 }, { x: 790, y: 640 }, F_BRIDGE, { x: 960, y: 900 }, { x: 1030, y: 1020 }],
  laneNames: { mill: 'Mill Road', king: 'King’s Road' },
  millPts: [
    { x: -40, y: 150 }, { x: 250, y: 150 }, { x: 420, y: 255 }, { x: 640, y: 220 },
    { x: 820, y: 300 }, { x: 900, y: 420 }, { x: 1080, y: 420 }, { x: 1200, y: 470 }, F_JUNCTION, F_GATE,
  ],
  kingPts: [
    { x: 560, y: 1045 }, { x: 640, y: 900 }, { x: 760, y: 810 }, F_BRIDGE,
    { x: 1060, y: 700 }, { x: 1180, y: 610 }, F_JUNCTION, F_GATE,
  ],
  // The leylines fan out from the inkwell beside the castle across the whole spread.
  leyNodes: FIELDS_LEY,
};

// ── Level 2: the castle courtyard ──────────────────────────────────────────
// The outer wall has fallen. The levy come through the ruined gatehouse in the west wall,
// the dogs over the breach in the north wall; both meet by the gate stair before the east gate.
const C_JUNCTION: Vec = { x: 1290, y: 520 };
const C_GATE: Vec = { x: 1536, y: 520 };
const C_STABLES: Vec = { x: 1180, y: 150 };
const C_INKWELL: Vec = { x: 1402, y: 838 };
const COURTYARD_GEO: LevelGeometry = {
  junction: C_JUNCTION, gate: C_GATE, choke: C_STABLES, inkwell: C_INKWELL,
  castle: { x: 1520, y: 520 }, mill: { x: -500, y: -500 }, pond: { x: -500, y: -500 }, river: [],
  laneNames: { mill: 'Gatehouse Passage', king: 'The Breach' },
  millPts: [
    { x: -40, y: 480 }, { x: 160, y: 480 }, { x: 300, y: 380 }, { x: 480, y: 300 }, { x: 640, y: 380 },
    { x: 620, y: 560 }, { x: 760, y: 680 }, { x: 980, y: 640 }, { x: 1120, y: 560 }, C_JUNCTION, C_GATE,
  ],
  kingPts: [
    { x: 900, y: -40 }, { x: 880, y: 110 }, { x: 1020, y: 190 }, C_STABLES, { x: 1340, y: 220 },
    { x: 1360, y: 360 }, { x: 1220, y: 430 }, C_JUNCTION, C_GATE,
  ],
  leyNodes: [
    { id: 'ink', x: C_INKWELL.x - 34, y: C_INKWELL.y - 8 },
    { id: 'k0', x: 1385, y: 768, parent: 'ink', bow: 6 },
    { id: 'f_stair', x: 1330, y: 640, parent: 'k0', bow: -6, foundation: { name: 'Gate Stair' } },
    // Wallward: north beside the keep, then west under the north wall
    { id: 'w1', x: 1412, y: 575, parent: 'k0', bow: -8 },
    { id: 'w2', x: 1410, y: 300, parent: 'w1', bow: 10 },
    { id: 'f_armoury', x: 1265, y: 330, parent: 'w2', bow: -8, foundation: { name: 'Armoury' } },
    { id: 'w3', x: 1270, y: 88, parent: 'w2', bow: -12 },
    { id: 'f_well', x: 1100, y: 290, parent: 'w3', bow: 10, foundation: { name: 'Old Well' } },
    { id: 'w4', x: 975, y: 58, parent: 'w3', bow: 10 },
    { id: 'f_stable', x: 930, y: 262, parent: 'w4', bow: -10, foundation: { name: 'Stable Yard' } },
    { id: 'b1', x: 650, y: 48, parent: 'w4', bow: -8 },
    { id: 'f_rubble', x: 760, y: 118, parent: 'b1', bow: 6, foundation: { name: 'Breach Rubble' } },
    { id: 'f_bakehouse', x: 520, y: 170, parent: 'b1', bow: 10, foundation: { name: 'Bakehouse' } },
    // Yardward: west across the courtyard
    { id: 'c1', x: 1232, y: 720, parent: 'k0', bow: 8 },
    { id: 'f_cistern', x: 1070, y: 780, parent: 'c1', bow: -8, foundation: { name: 'Cistern' } },
    { id: 'f_barracks', x: 1150, y: 455, parent: 'c1', bow: 12, foundation: { name: 'Barracks' } },
    { id: 'c2', x: 905, y: 765, parent: 'c1', bow: -10 },
    { id: 'f_smithy', x: 720, y: 812, parent: 'c2', bow: 8, foundation: { name: 'Smithy' } },
    { id: 'f_chapel', x: 862, y: 520, parent: 'c2', bow: -12, foundation: { name: 'Chapel Steps' } },
    { id: 'c4', x: 560, y: 905, parent: 'c2', bow: 10 },
    { id: 'c5', x: 385, y: 705, parent: 'c4', bow: -12 },
    { id: 'f_herb', x: 500, y: 460, parent: 'c5', bow: 10, foundation: { name: 'Herb Garden' } },
    { id: 'f_training', x: 330, y: 545, parent: 'c5', bow: -8, foundation: { name: 'Training Yard' } },
    { id: 'f_gatehouse', x: 170, y: 612, parent: 'c5', bow: 10, foundation: { name: 'Gatehouse Ruin' } },
  ],
};

// ── Level 3: the keep, seen in cut-away ────────────────────────────────────
// Four floors stacked like an architect's section. The levy come in at the broken door on the
// ground floor (west) and up the Great Stair; the dogs come up from the cellars (east). The two
// stairs meet on the landing of the Great Hall, and one grand stair climbs to the top floor and
// along it to the study door, where the wizard keeps his inkwell.
/** Floor lines of the keep (the top of each floor), ground to top. */
export const KEEP_FLOORS = [910, 690, 470, 250];
const K_JUNCTION: Vec = { x: 800, y: 450 };
const K_GATE: Vec = { x: 1392, y: 230 };
const K_CELLAR: Vec = { x: 1300, y: 890 };
const K_INKWELL: Vec = { x: 1462, y: 192 };
const K_SHARED: Vec[] = [K_JUNCTION, { x: 1000, y: 450 }, { x: 1160, y: 230 }, K_GATE];
const KEEP_GEO: LevelGeometry = {
  junction: K_JUNCTION, gate: K_GATE, choke: K_CELLAR, inkwell: K_INKWELL,
  castle: { x: -500, y: -500 }, mill: { x: -500, y: -500 }, pond: { x: -500, y: -500 }, river: [],
  laneNames: { mill: 'Great Stair', king: 'Cellar Stair' },
  millPts: [{ x: -40, y: 890 }, { x: 300, y: 890 }, { x: 480, y: 670 }, { x: 620, y: 670 }, ...K_SHARED],
  kingPts: [{ x: 1640, y: 890 }, K_CELLAR, { x: 1120, y: 670 }, { x: 980, y: 670 }, ...K_SHARED],
  leyNodes: [
    { id: 'ink', x: K_INKWELL.x - 34, y: K_INKWELL.y - 6 },
    // down the east tower
    { id: 'e1', x: 1500, y: 330, parent: 'ink', bow: 8 },
    { id: 'f_gallery', x: 1120, y: 465, parent: 'e1', bow: -10, foundation: { name: 'Minstrels\u2019 Gallery' } },
    { id: 'e2', x: 1500, y: 560, parent: 'e1', bow: -6 },
    { id: 'f_eastledge', x: 1180, y: 560, parent: 'e2', bow: 8, foundation: { name: 'East Landing' } },
    { id: 'f_solar', x: 1240, y: 685, parent: 'e2', bow: -8, foundation: { name: 'The Solar' } },
    { id: 'e3', x: 1490, y: 800, parent: 'e2', bow: 6 },
    { id: 'f_buttery', x: 1180, y: 905, parent: 'e3', bow: 10, foundation: { name: 'Buttery' } },
    // west under the roof, then down the west tower
    { id: 't1', x: 1250, y: 120, parent: 'ink', bow: -6 },
    { id: 'f_studyledge', x: 1270, y: 300, parent: 't1', bow: 10, foundation: { name: 'Study Stair' } },
    { id: 't2', x: 900, y: 110, parent: 't1', bow: 8 },
    { id: 'f_tower', x: 1000, y: 245, parent: 't2', bow: -8, foundation: { name: 'Top Landing' } },
    { id: 'f_bell', x: 900, y: 300, parent: 't2', bow: 10, foundation: { name: 'Bell Loft' } },
    { id: 't3', x: 560, y: 120, parent: 't2', bow: -8 },
    { id: 'w1', x: 120, y: 330, parent: 't3', bow: 10 },
    { id: 'f_minstrel', x: 560, y: 465, parent: 'w1', bow: -8, foundation: { name: 'Tapestry Room' } },
    { id: 'f_hall', x: 690, y: 465, parent: 'w1', bow: 12, foundation: { name: 'Great Hall' } },
    { id: 'w2', x: 100, y: 560, parent: 'w1', bow: -8 },
    { id: 'f_westledge', x: 420, y: 560, parent: 'w2', bow: 8, foundation: { name: 'West Landing' } },
    { id: 'f_library', x: 360, y: 685, parent: 'w2', bow: -10, foundation: { name: 'Library' } },
    { id: 'f_armoury', x: 800, y: 685, parent: 'w2', bow: -16, foundation: { name: 'Armoury' } },
    { id: 'w3', x: 100, y: 800, parent: 'w2', bow: 8 },
    { id: 'f_kitchen', x: 420, y: 905, parent: 'w3', bow: 10, foundation: { name: 'Kitchen' } },
  ],
};

// ── Level 4: the flooded fen ───────────────────────────────────────────────
// The water meadows below Goosebridge in flood. The levy wade in along the Reed Causeway, which
// zigzags across the drowned fields in three switchbacks; the dogs come up the Eel Dyke from the
// sluice in the south, stepping east and north. Both meet below the Withy Bed and one causeway
// runs east to the Weir House, where the wizard keeps his inkwell.
const N_JUNCTION: Vec = { x: 1100, y: 460 };
const N_GATE: Vec = { x: 1440, y: 460 };
const N_SLUICE: Vec = { x: 300, y: 860 };
const N_INKWELL: Vec = { x: 1470, y: 640 };
const N_SHARED: Vec[] = [N_JUNCTION, { x: 1260, y: 460 }, N_GATE];
const FEN_GEO: LevelGeometry = {
  junction: N_JUNCTION, gate: N_GATE, choke: N_SLUICE, inkwell: N_INKWELL,
  castle: { x: -500, y: -500 }, mill: { x: -500, y: -500 }, pond: { x: -500, y: -500 }, river: [],
  laneNames: { mill: 'Reed Causeway', king: 'Eel Dyke' },
  millPts: [{ x: -40, y: 180 }, { x: 240, y: 180 }, { x: 240, y: 420 }, { x: 520, y: 420 }, { x: 520, y: 200 }, { x: 820, y: 200 }, { x: 980, y: 420 }, ...N_SHARED],
  kingPts: [{ x: 300, y: 1040 }, N_SLUICE, { x: 640, y: 860 }, { x: 640, y: 660 }, { x: 920, y: 660 }, { x: 1040, y: 580 }, ...N_SHARED],
  leyNodes: [
    { id: 'ink', x: N_INKWELL.x - 34, y: N_INKWELL.y - 6 },
    { id: 'f_weir', x: 1300, y: 560, parent: 'ink', bow: 8, foundation: { name: 'Weir Head' } },
    { id: 'w1', x: 1180, y: 610, parent: 'ink', bow: -6 },
    { id: 'f_withy', x: 960, y: 520, parent: 'w1', bow: 8, foundation: { name: 'Withy Bed' } },
    { id: 'f_staithe', x: 780, y: 560, parent: 'w1', bow: -10, foundation: { name: 'Peat Staithe' } },
    // south, along the staithes
    { id: 's1', x: 1380, y: 800, parent: 'ink', bow: -6 },
    { id: 's2', x: 1000, y: 900, parent: 's1', bow: 8 },
    { id: 'f_osiers', x: 800, y: 760, parent: 's2', bow: 10, foundation: { name: 'Osier Bed' } },
    { id: 's3', x: 640, y: 960, parent: 's2', bow: -8 },
    { id: 'f_island', x: 470, y: 760, parent: 's3', bow: 6, foundation: { name: 'Eel Island' } },
    { id: 'f_dyke', x: 180, y: 900, parent: 's3', bow: -10, foundation: { name: 'Dyke End' } },
    // north, across the drowned meadows
    { id: 'n1', x: 1520, y: 300, parent: 'ink', bow: 8 },
    { id: 'f_punt', x: 1200, y: 350, parent: 'n1', bow: 6, foundation: { name: 'Punt Landing' } },
    { id: 'n2', x: 1250, y: 220, parent: 'n1', bow: -8 },
    { id: 'f_sluice', x: 1060, y: 300, parent: 'n2', bow: 6, foundation: { name: 'Sluice House' } },
    { id: 'n3', x: 900, y: 110, parent: 'n2', bow: 10 },
    { id: 'f_peat', x: 680, y: 128, parent: 'n3', bow: -6, foundation: { name: 'Peat Cuttings' } },
    { id: 'f_drowned', x: 670, y: 310, parent: 'n3', bow: 10, foundation: { name: 'Drowned Mill' } },
    { id: 'n4', x: 470, y: 80, parent: 'n3', bow: -8 },
    { id: 'f_heronry', x: 380, y: 300, parent: 'n4', bow: 8, foundation: { name: 'Heronry' } },
    { id: 'n5', x: 110, y: 130, parent: 'n4', bow: 8 },
    { id: 'f_reedbank', x: 140, y: 300, parent: 'n5', bow: -6, foundation: { name: 'Reed Bank' } },
    { id: 'n6', x: 60, y: 460, parent: 'n5', bow: 6 },
    { id: 'f_carr', x: 380, y: 560, parent: 'n6', bow: -10, foundation: { name: 'Alder Carr' } },
  ],
};

// ── Level 5: the barrows ───────────────────────────────────────────────────
// The chalk downs at dusk, where the hunt-master kennels his dogs in the old mound doors and the
// Cairn-Born sleep in the long barrows. The levy come over the hill by the Corpse Road, which loops
// north round the dolmen before turning east; the dogs break out of the Kennel Barrow in the south
// and run the sunken Hollow Way east and back north. The wizard holds the Ward Ring, a henge.
const B_JUNCTION: Vec = { x: 1120, y: 520 };
const B_GATE: Vec = { x: 1400, y: 520 };
const B_DOOR: Vec = { x: 520, y: 900 };
const B_INKWELL: Vec = { x: 1462, y: 700 };
const B_SHARED: Vec[] = [B_JUNCTION, { x: 1260, y: 520 }, B_GATE];
const BARROWS_GEO: LevelGeometry = {
  junction: B_JUNCTION, gate: B_GATE, choke: B_DOOR, inkwell: B_INKWELL,
  castle: { x: -500, y: -500 }, mill: { x: -500, y: -500 }, pond: { x: -500, y: -500 }, river: [],
  laneNames: { mill: 'Corpse Road', king: 'Hollow Way' },
  millPts: [{ x: -40, y: 600 }, { x: 180, y: 600 }, { x: 320, y: 420 }, { x: 240, y: 240 }, { x: 420, y: 140 }, { x: 660, y: 200 }, { x: 760, y: 420 }, { x: 960, y: 440 }, ...B_SHARED],
  kingPts: [{ x: 520, y: 1040 }, B_DOOR, { x: 800, y: 900 }, { x: 980, y: 920 }, { x: 1200, y: 840 }, { x: 1060, y: 680 }, ...B_SHARED],
  leyNodes: [
    { id: 'ink', x: B_INKWELL.x - 34, y: B_INKWELL.y - 6 },
    { id: 'f_ring', x: 1300, y: 640, parent: 'ink', bow: 8, foundation: { name: 'Stone Ring' } },
    { id: 'f_gallows', x: 1240, y: 700, parent: 'ink', bow: -8, foundation: { name: 'Gibbet Knap' } },
    { id: 'w1', x: 1150, y: 600, parent: 'ink', bow: 6 },
    { id: 'f_longbarrow', x: 960, y: 560, parent: 'w1', bow: -8, foundation: { name: 'Long Barrow' } },
    // south, under the downs
    { id: 's1', x: 1390, y: 870, parent: 'ink', bow: -6 },
    { id: 's2', x: 1100, y: 960, parent: 's1', bow: 8 },
    { id: 'f_hillfort', x: 880, y: 800, parent: 's2', bow: -8, foundation: { name: 'Hill Fort' } },
    { id: 's3', x: 700, y: 970, parent: 's2', bow: 8 },
    { id: 'f_cromlech', x: 640, y: 800, parent: 's3', bow: -6, foundation: { name: 'Cromlech' } },
    { id: 'f_yew', x: 380, y: 860, parent: 's3', bow: 10, foundation: { name: 'Old Yew' } },
    // north, along the ridge
    { id: 'n1', x: 1500, y: 360, parent: 'ink', bow: 8 },
    { id: 'f_kingstone', x: 1180, y: 420, parent: 'n1', bow: -6, foundation: { name: 'King Stone' } },
    { id: 'n2', x: 1100, y: 220, parent: 'n1', bow: -8 },
    { id: 'f_owlstone', x: 880, y: 320, parent: 'n2', bow: 8, foundation: { name: 'Owl Stone' } },
    { id: 'n3', x: 760, y: 60, parent: 'n2', bow: 10 },
    { id: 'f_chalk', x: 560, y: 320, parent: 'n3', bow: -8, foundation: { name: 'Chalk Horse' } },
    { id: 'n4', x: 440, y: 60, parent: 'n3', bow: -8 },
    { id: 'f_cairnhill', x: 300, y: 120, parent: 'n4', bow: 6, foundation: { name: 'Cairn Hill' } },
    { id: 'f_dolmen', x: 400, y: 300, parent: 'n4', bow: 10, foundation: { name: 'Dolmen' } },
    { id: 'n5', x: 60, y: 300, parent: 'n4', bow: -8 },
    { id: 'f_tumulus', x: 120, y: 480, parent: 'n5', bow: 8, foundation: { name: 'Tumulus' } },
    { id: 'f_dyke', x: 420, y: 520, parent: 'n5', bow: -10, foundation: { name: 'Bank and Ditch' } },
  ],
};

export const LEVEL_GEOMETRY: Record<LevelId, LevelGeometry> = { fields: FIELDS_GEO, courtyard: COURTYARD_GEO, keep: KEEP_GEO, fen: FEN_GEO, barrows: BARROWS_GEO };

export interface Lane {
  id: LaneId;
  name: string;
  pts: Vec[];
  cum: number[];
  length: number;
  /** Distance along this lane at which it reaches the shared junction. */
  junctionS: number;
}

function buildLane(id: LaneId, name: string, pts: Vec[], junction: Vec): Lane {
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
  const ji = pts.indexOf(junction);
  return { id, name, pts, cum, length: cum[cum.length - 1], junctionS: cum[ji] };
}

export const LANE_IDS: LaneId[] = ['mill', 'king'];

// ── The current level (live bindings: setMapLevel swaps them all) ──────────
export let LEVEL: LevelId = 'fields';
export let JUNCTION: Vec = F_JUNCTION;
export let GATE: Vec = F_GATE;
/** Where the dogs are announced on the King's lane (the bridge on level 1). */
export let BRIDGE: Vec = F_BRIDGE;
export let MILL: Vec = FIELDS_GEO.mill;
export let POND: Vec = FIELDS_GEO.pond;
/** The inkwell stands in the castle garden, just south of the walls. */
export let INKWELL: Vec = F_INKWELL;
export let CASTLE: Vec = FIELDS_GEO.castle;
export let RIVER: Vec[] = FIELDS_GEO.river;
export let LANES: Record<LaneId, Lane> = {} as Record<LaneId, Lane>;
export let LEY_NODES: LeyNode[] = [];
export let NODE: Record<string, LeyNode> = {};
export let FOUNDATION_IDS: string[] = [];
export interface LeyEdge { child: string; parent: string; pts: Vec[]; cum: number[]; length: number }
export let LEY_EDGES: LeyEdge[] = [];
export let EDGE_TO: Record<string, LeyEdge> = {};

export function setMapLevel(id: LevelId) {
  const G = LEVEL_GEOMETRY[id];
  LEVEL = id;
  JUNCTION = G.junction; GATE = G.gate; BRIDGE = G.choke; MILL = G.mill; POND = G.pond;
  INKWELL = G.inkwell; CASTLE = G.castle; RIVER = G.river;
  LANES = {
    mill: buildLane('mill', G.laneNames.mill, G.millPts, G.junction),
    king: buildLane('king', G.laneNames.king, G.kingPts, G.junction),
  };
  LEY_NODES = G.leyNodes;
  NODE = Object.fromEntries(LEY_NODES.map((n) => [n.id, n]));
  FOUNDATION_IDS = LEY_NODES.filter((n) => n.foundation).map((n) => n.id);
  LEY_EDGES = LEY_NODES.filter((n) => n.parent).map((n) => {
    const pts = sampleEdge(n);
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + dist(pts[i - 1], pts[i]));
    return { child: n.id, parent: n.parent!, pts, cum, length: cum[cum.length - 1] };
  });
  EDGE_TO = Object.fromEntries(LEY_EDGES.map((e) => [e.child, e]));
}

export function dist(a: Vec, b: Vec): number { return Math.hypot(a.x - b.x, a.y - b.y); }

export function pointAt(lane: Lane, s: number): Vec & { angle: number } {
  const c = Math.max(0, Math.min(lane.length, s));
  let i = 1;
  while (i < lane.cum.length - 1 && lane.cum[i] < c) i++;
  const a = lane.pts[i - 1], b = lane.pts[i];
  const seg = lane.cum[i] - lane.cum[i - 1] || 1;
  const t = (c - lane.cum[i - 1]) / seg;
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

export function projectOnSegment(p: Vec, a: Vec, b: Vec): { t: number; point: Vec; d: number } {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
  const point = { x: a.x + dx * t, y: a.y + dy * t };
  return { t, point, d: dist(p, point) };
}

export function nearestOnLane(lane: Lane, p: Vec): { s: number; d: number; point: Vec } {
  let best = { s: 0, d: Infinity, point: lane.pts[0] };
  for (let i = 1; i < lane.pts.length; i++) {
    const pr = projectOnSegment(p, lane.pts[i - 1], lane.pts[i]);
    if (pr.d < best.d) best = { s: lane.cum[i - 1] + pr.t * (lane.cum[i] - lane.cum[i - 1]), d: pr.d, point: pr.point };
  }
  return best;
}

/** Sample points every `step` units along a lane between s0 and s1. */
export function sampleLane(lane: Lane, s0: number, s1: number, step = 12): Vec[] {
  const out: Vec[] = [];
  for (let s = Math.max(0, s0); s <= Math.min(lane.length, s1); s += step) out.push(pointAt(lane, s));
  return out;
}

// ── Leylines ────────────────────────────────────────────────────────────────
// A fixed tree rooted at the inkwell. Leaves are tower foundations.

export interface LeyNode {
  id: string;
  x: number;
  y: number;
  parent?: string;
  /** Sideways bow of the edge from parent → this node (purely visual, also used for snapping). */
  bow?: number;
  foundation?: { name: string };
}

/** Polyline samples for the edge parent → node, following its bow. */
function sampleEdge(n: LeyNode): Vec[] {
  const p = NODE[n.parent!];
  const mx = (p.x + n.x) / 2, my = (p.y + n.y) / 2;
  const len = dist(p, n) || 1;
  const nx = -(n.y - p.y) / len, ny = (n.x - p.x) / len;
  const cx = mx + nx * (n.bow ?? 0), cy = my + ny * (n.bow ?? 0);
  const steps = Math.max(6, Math.ceil(len / 14));
  const out: Vec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    out.push({ x: u * u * p.x + 2 * u * t * cx + t * t * n.x, y: u * u * p.y + 2 * u * t * cy + t * t * n.y });
  }
  return out;
}

setMapLevel('fields');

/** Node ids from the inkwell down to `nodeId` (inclusive). */
export function routeNodes(nodeId: string): string[] {
  const out: string[] = [];
  let n: LeyNode | undefined = NODE[nodeId];
  while (n) { out.unshift(n.id); n = n.parent ? NODE[n.parent] : undefined; }
  return out;
}

/** Full polyline from the inkwell to a foundation. */
export function routePolyline(nodeId: string): Vec[] {
  const ids = routeNodes(nodeId);
  const out: Vec[] = [{ x: NODE.ink.x, y: NODE.ink.y }];
  for (let i = 1; i < ids.length; i++) out.push(...EDGE_TO[ids[i]].pts.slice(1));
  return out;
}

/** Polyline from the inkwell to a point partway (t ∈ [0,1] by sample index) along the edge into `child`. */
export function routeToEdgePoint(child: string, sampleIdx: number, point: Vec): Vec[] {
  const parentPath = routePolyline(EDGE_TO[child].parent);
  return [...parentPath, ...EDGE_TO[child].pts.slice(1, sampleIdx + 1), point];
}

export interface Snap { child: string; sampleIdx: number; point: Vec; d: number }

/** Nearest point on the whole leyline network. */
export function snapToNetwork(p: Vec): Snap | null {
  let best: Snap | null = null;
  for (const e of LEY_EDGES) {
    for (let i = 1; i < e.pts.length; i++) {
      const pr = projectOnSegment(p, e.pts[i - 1], e.pts[i]);
      if (!best || pr.d < best.d) best = { child: e.child, sampleIdx: i - 1, point: pr.point, d: pr.d };
    }
  }
  return best;
}

export function polylineLength(pts: Vec[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  return L;
}

export function pointAlong(pts: Vec[], s: number): Vec {
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[i - 1], pts[i]);
    if (acc + d >= s) {
      const t = d ? (s - acc) / d : 0;
      return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * t, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * t };
    }
    acc += d;
  }
  return pts[pts.length - 1];
}
