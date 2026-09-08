// Authored content rows, normalized/frozen by atmospherePresets.js. No new
// scheduler or room IDs in the controller: places choose these data profiles.
const sunset={fogColor:'#586173',fogDensity:.012,skyColor:'#a07b7f',groundColor:'#535f63',hemisphereIntensity:2.2,sunColor:'#ffd09b',sunIntensity:2.8,exposure:.95,skyPhase:.65};
const cloudy={...sunset,fogColor:'#4f6472',skyColor:'#6a7b88',sunColor:'#c5d0d7',sunIntensity:1.6,skyPhase:.72};
const rainy={...cloudy,fogColor:'#344e62',fogDensity:.022,skyColor:'#465e73',sunIntensity:1.4,skyPhase:.78};
const night={...sunset,fogColor:'#23374d',skyColor:'#2c425b',sunColor:'#a9c2df',sunIntensity:1.2,hemisphereIntensity:1.8,skyPhase:.86};
const rows=[
  {atMs:0,intensity:0,rain:0,cloud:.1,wetness:0,wind:[.12,.04],visuals:night},
  {atMs:60000,intensity:0,rain:0,cloud:.15,wetness:0,wind:[.1,.03],visuals:sunset},
  {atMs:300000,intensity:0,rain:0,cloud:.15,wetness:0,wind:[.1,.03],visuals:sunset},
  {atMs:360000,intensity:0,rain:0,cloud:.7,wetness:.14,wind:[.2,.06],visuals:cloudy},
  {atMs:600000,intensity:0,rain:0,cloud:.7,wetness:.7,wind:[.2,.06],visuals:cloudy},
  {atMs:660000,intensity:.35,rain:.35,cloud:.8,wetness:.64,wind:[.25,.08],visuals:rainy},
  {atMs:900000,intensity:.35,rain:.35,cloud:.8,wetness:.4,wind:[.25,.08],visuals:rainy},
  {atMs:960000,intensity:0,rain:0,cloud:.1,wetness:.32,wind:[.12,.04],visuals:night},
];
export const SOCIAL_ATMOSPHERE_PRESETS={
  'rain-night':{weather:'fixed',intensity:.8,wind:[.2,.05],rain:.8,cloud:.8,wetness:1,
    events:{lightning:true,meteor:false},
    visuals:{fogColor:'#283f51',fogDensity:.022,skyColor:'#657d94',groundColor:'#465d60',hemisphereIntensity:2.4,sunColor:'#b8cbd8',sunIntensity:2.2,exposure:.9,skyPhase:.82},
    audio:{rain:1,roof:0,wind:.3,lowpassHz:6000}},
  'desert-night':{weather:'fixed',intensity:0,wind:[.12,.04],rain:0,cloud:.05,wetness:0,
    events:{lightning:false,meteor:true},
    visuals:{fogColor:'#111b2b',fogDensity:.008,skyColor:'#7486a7',groundColor:'#76634f',hemisphereIntensity:1.8,sunColor:'#b1c6e7',sunIntensity:1.5,exposure:.85,skyPhase:.8},
    audio:{rain:0,roof:0,wind:.2,lowpassHz:6000}},
  'rooftop-cycle':{weather:'scheduled',intensity:0,wind:[.1,.03],rain:0,cloud:.15,wetness:0,
    events:{lightning:false,meteor:false},schedule:{cycleMs:1200000,keyframes:rows},visuals:sunset,
    audio:{rain:0,roof:0,wind:.2,lowpassHz:6000}},
};
