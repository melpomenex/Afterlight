// Content overrides only. The legacy IDs, seeds and gate topology are owned
// by placeDefinitions; social places never derive exits from array order.
export const SOCIAL_PLACE_OVERRIDES = {
  court: {
    shell:'none', subtitle:'STAY FOR THE RAIN', color:'#283f51', sun:'#b8cbd8',
    description:'Rain on blue stone. A warm arcade and a seat out of the weather.',
    capabilities:{seating:true,sharedMedia:false,conferencing:false},
    atmosphere:{preset:'rain-night',weatherMode:'fixed',timeMode:'fixed'},
    minimapPath:'M34 40H119V49H34Z M80 53H90V60H80Z M29 58H124 M77 58V88',
  },
  rooftops: {
    shell:'none', subtitle:'ABOVE THE EVENING',
    description:'A sheltered lounge above the city. Watch windows light up across the skyline.',
    capabilities:{seating:true,sharedMedia:false,conferencing:false},
    atmosphere:{preset:'rooftop-cycle',weatherMode:'scheduled',timeMode:'fixed'},
    minimapPath:'M39 36H53V47H39Z M68 37H99V49H68Z M30 59H125 M77 59V88',
  },
};

export const DESERT_CAMP_DEFINITION = {
  id:'desert-camp',name:'The Desert Camp',district:'BEYOND THE CITY / 21',subtitle:'UNDER A THOUSAND STARS',
  color:'#111b2b',sun:'#9badca',description:'A circle of firelight, a canvas shelter, and a sky worth staying for.',
  kind:'environment',seed:629,bounds:{minX:-11.3,maxX:11.3,minZ:-9.5,maxZ:10.3},
  spawn:[-9,0],companionSpawn:[-8.2,1],shell:'none',builderKey:'desert-camp',
  minimapPath:'M38 37H52V46H38Z M91 37H113V50H91Z M66 52H87V65H66Z M29 58L57 70H96L125 58',
  atmosphere:{preset:'desert-night',weatherMode:'fixed',timeMode:'fixed'},
  capabilities:{seating:true,sharedMedia:false,conferencing:false},social:{featured:false,legacy:false},
  exits:[{id:'west',kind:'district',position:[-10.7,0],target:'court'},{id:'east',kind:'district',position:[10.7,0],target:'theater'}],
};
