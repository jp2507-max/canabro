/**
 * Cannabis strain data for the Canabro app
 */

export interface Strain {
  id: string;
  name: string;
  type: 'indica' | 'sativa' | 'hybrid';
  thcContent?: number;
  cbdContent?: number;
  description?: string;
  effects?: string[];
  flavors?: string[];
  growDifficulty?: 'easy' | 'moderate' | 'hard';
  imageUrl?: string;
}

/**
 * Popular cannabis strains
 */
export const popularStrains: Strain[] = [
  {
    id: '1',
    name: 'OG Kush',
    type: 'hybrid',
    thcContent: 23,
    cbdContent: 0.3,
    description:
      'OG Kush is a legendary strain with a name that has recognition even outside of the cannabis world. Despite its fame, though, its exact origins remain a mystery.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Sleepy'],
    flavors: ['Earthy', 'Pine', 'Woody'],
    growDifficulty: 'moderate',
  },
  {
    id: '2',
    name: 'Blue Dream',
    type: 'hybrid',
    thcContent: 18,
    cbdContent: 0.1,
    description:
      'Blue Dream is a sativa-dominant hybrid originating in California, achieved by crossing Blueberry Indica with Haze.',
    effects: ['Happy', 'Relaxed', 'Uplifted', 'Creative', 'Euphoric'],
    flavors: ['Berry', 'Sweet', 'Blueberry'],
    growDifficulty: 'easy',
  },
  {
    id: '3',
    name: 'Girl Scout Cookies',
    type: 'hybrid',
    thcContent: 28,
    cbdContent: 0.2,
    description:
      'GSC, formerly known as Girl Scout Cookies, is an OG Kush and Durban Poison hybrid cross whose reputation grew too large to stay within the borders of its California homeland.',
    effects: ['Happy', 'Euphoric', 'Relaxed', 'Uplifted', 'Creative'],
    flavors: ['Sweet', 'Earthy', 'Dessert'],
    growDifficulty: 'moderate',
  },
  {
    id: '4',
    name: 'Sour Diesel',
    type: 'sativa',
    thcContent: 22,
    cbdContent: 0.2,
    description:
      'Sour Diesel, sometimes called Sour D, is an invigorating sativa-dominant strain named after its pungent, diesel-like aroma.',
    effects: ['Energetic', 'Happy', 'Uplifted', 'Euphoric', 'Creative'],
    flavors: ['Diesel', 'Earthy', 'Pungent'],
    growDifficulty: 'moderate',
  },
  {
    id: '5',
    name: 'Northern Lights',
    type: 'indica',
    thcContent: 18,
    cbdContent: 0.1,
    description:
      'Northern Lights stands among the most famous strains of all time, a pure indica cherished for its resinous buds, fast flowering, and resilience during growth.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric', 'Hungry'],
    flavors: ['Sweet', 'Spicy', 'Earthy'],
    growDifficulty: 'easy',
  },
  {
    id: '6',
    name: 'White Widow',
    type: 'hybrid',
    thcContent: 20,
    cbdContent: 0.1,
    description:
      'White Widow is a hybrid strain that was created in the Netherlands by crossing a Brazilian sativa landrace with a resin-heavy South Indian indica.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative'],
    flavors: ['Earthy', 'Woody', 'Pungent'],
    growDifficulty: 'moderate',
  },
  {
    id: '7',
    name: 'Granddaddy Purple',
    type: 'indica',
    thcContent: 17,
    cbdContent: 0.1,
    description:
      'Granddaddy Purple (or GDP) is a famous indica cross between Purple Urkle and Big Bud.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Hungry', 'Euphoric'],
    flavors: ['Grape', 'Berry', 'Sweet'],
    growDifficulty: 'easy',
  },
  {
    id: '8',
    name: 'Jack Herer',
    type: 'sativa',
    thcContent: 18,
    cbdContent: 0.2,
    description:
      'Jack Herer is a sativa-dominant cannabis strain that has gained as much renown as its namesake, the marijuana activist and author of The Emperor Wears No Clothes.',
    effects: ['Happy', 'Uplifted', 'Energetic', 'Creative', 'Focused'],
    flavors: ['Earthy', 'Pine', 'Woody'],
    growDifficulty: 'moderate',
  },
  {
    id: '9',
    name: 'Durban Poison',
    type: 'sativa',
    thcContent: 24,
    cbdContent: 0.02,
    description: 'Durban Poison is a pure sativa landrace strain native to South Africa.',
    effects: ['Energetic', 'Focused', 'Creative', 'Happy', 'Uplifted'],
    flavors: ['Sweet', 'Pine', 'Earthy'],
    growDifficulty: 'moderate',
  },
  {
    id: '10',
    name: 'AK-47',
    type: 'hybrid',
    thcContent: 20,
    cbdContent: 0.3,
    description: 'AK-47 is a Sativa-dominant hybrid with bright white coloring.',
    effects: ['Happy', 'Uplifted', 'Relaxed', 'Energetic', 'Creative'],
    flavors: ['Earthy', 'Pungent', 'Woody'],
    growDifficulty: 'easy',
  },
  {
    id: '11',
    name: 'Pineapple Express',
    type: 'hybrid',
    thcContent: 18,
    cbdContent: 0.1,
    description:
      'Pineapple Express combines the potent and flavorful forces of parent strains Trainwreck and Hawaiian.',
    effects: ['Happy', 'Uplifted', 'Euphoric', 'Energetic', 'Relaxed'],
    flavors: ['Pineapple', 'Tropical', 'Sweet'],
    growDifficulty: 'moderate',
  },
  {
    id: '12',
    name: 'Bubba Kush',
    type: 'indica',
    thcContent: 17,
    cbdContent: 0.1,
    description:
      'Bubba Kush is an indica strain that has gained notoriety in the US and beyond for its heavy tranquilizing effects.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Hungry', 'Euphoric'],
    flavors: ['Earthy', 'Coffee', 'Woody'],
    growDifficulty: 'moderate',
  },
  {
    id: '13',
    name: 'Amnesia Haze',
    type: 'sativa',
    thcContent: 22,
    cbdContent: 0.2,
    description:
      'Amnesia Haze has a classic, almost pure Sativa high with a THC level of around 22%.',
    effects: ['Happy', 'Uplifted', 'Euphoric', 'Energetic', 'Creative'],
    flavors: ['Earthy', 'Citrus', 'Lemon'],
    growDifficulty: 'hard',
  },
  {
    id: '14',
    name: 'Wedding Cake',
    type: 'hybrid',
    thcContent: 25,
    cbdContent: 0.1,
    description:
      'Wedding Cake is a potent indica-hybrid marijuana strain made by crossing Triangle Kush with Animal Mints.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative'],
    flavors: ['Sweet', 'Vanilla', 'Earthy'],
    growDifficulty: 'moderate',
  },
  {
    id: '15',
    name: 'Green Crack',
    type: 'sativa',
    thcContent: 17,
    cbdContent: 0.1,
    description:
      'Green Crack, also known as "Green Crush" and "Mango Crack," is a potent sativa strain.',
    effects: ['Energetic', 'Focused', 'Happy', 'Uplifted', 'Euphoric'],
    flavors: ['Citrus', 'Earthy', 'Sweet'],
    growDifficulty: 'moderate',
  },
  {
    id: '16',
    name: 'Purple Haze',
    type: 'sativa',
    thcContent: 20,
    cbdContent: 0.1,
    description: "Purple Haze is a sativa-dominant strain named after Jimi Hendrix's classic song.",
    effects: ['Happy', 'Uplifted', 'Euphoric', 'Energetic', 'Creative'],
    flavors: ['Earthy', 'Sweet', 'Berry'],
    growDifficulty: 'moderate',
  },
  {
    id: '17',
    name: 'Gelato',
    type: 'hybrid',
    thcContent: 20,
    cbdContent: 0.1,
    description:
      'Gelato (also referred to as "Larry Bird") is a tantalizing hybrid cannabis strain from Cookie Fam Genetics.',
    effects: ['Relaxed', 'Happy', 'Euphoric', 'Uplifted', 'Creative'],
    flavors: ['Sweet', 'Citrus', 'Berry'],
    growDifficulty: 'moderate',
  },
  {
    id: '18',
    name: 'Gorilla Glue',
    type: 'hybrid',
    thcContent: 26,
    cbdContent: 0.1,
    description:
      'Gorilla Glue, also known as "Gorilla Glue #1" or "420 Glue" is a potent hybrid strain.',
    effects: ['Relaxed', 'Euphoric', 'Happy', 'Sleepy', 'Uplifted'],
    flavors: ['Earthy', 'Pine', 'Chemical'],
    growDifficulty: 'moderate',
  },
  {
    id: '19',
    name: 'Bruce Banner',
    type: 'hybrid',
    thcContent: 24,
    cbdContent: 0.1,
    description: 'Bruce Banner, also known as "Banner" and "OG Banner," is a potent hybrid strain.',
    effects: ['Creative', 'Euphoric', 'Happy', 'Relaxed', 'Uplifted'],
    flavors: ['Sweet', 'Earthy', 'Diesel'],
    growDifficulty: 'moderate',
  },
  {
    id: '20',
    name: 'Skywalker OG',
    type: 'hybrid',
    thcContent: 23,
    cbdContent: 0.2,
    description:
      'Skywalker OG is a potent indica-dominant hybrid strain that may just take you to a galaxy far, far away.',
    effects: ['Relaxed', 'Sleepy', 'Happy', 'Euphoric', 'Hungry'],
    flavors: ['Earthy', 'Spicy', 'Herbal'],
    growDifficulty: 'moderate',
  },
];

/**
 * Get all strains
 */
export const getAllStrains = (): Strain[] => {
  return popularStrains;
};

/**
 * Search strains by name
 */
export const searchStrainsByName = (query: string): Strain[] => {
  if (!query || query.trim() === '') {
    return popularStrains.slice(0, 5); // Return top 5 popular strains if no query
  }

  const normalizedQuery = query.toLowerCase().trim();

  return popularStrains
    .filter((strain) => strain.name.toLowerCase().includes(normalizedQuery))
    .slice(0, 10); // Limit to 10 results
};

/**
 * Get strain by ID
 */
export const getStrainById = (id: string): Strain | undefined => {
  return popularStrains.find((strain) => strain.id === id);
};
