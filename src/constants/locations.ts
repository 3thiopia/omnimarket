export interface Region {
  name: string;
  subRegions?: string[];
}

export const ETHIOPIAN_LOCATIONS: Region[] = [
  {
    name: 'Addis Ababa',
    subRegions: [
      'Addis Ketema',
      'Akaki Kality',
      'Arada',
      'Bole',
      'Gullele',
      'Kirkos',
      'Kolfe Keranio',
      'Lideta',
      'Nifas Silk-Lafto',
      'Lemi Kura',
      'Yeka'
    ]
  },
  {
    name: 'Afar',
    subRegions: ['Awsi Rasu', 'Kilbet Rasu', 'Gabi Rasu', 'Fanti Rasu', 'Hari Rasu']
  },
  {
    name: 'Amhara',
    subRegions: [
      'Bahir Dar (Special Zone)',
      'East Gojjam',
      'North Gondar',
      'North Shewa',
      'North Wollo',
      'South Gondar',
      'South Wollo',
      'West Gojjam',
      'Wag Hemra',
      'Awi',
      'Oromia Zone'
    ]
  },
  {
    name: 'Benishangul-Gumuz',
    subRegions: ['Asosa', 'Kamashi', 'Metekel']
  },
  {
    name: 'Dire Dawa',
    subRegions: ['Dire Dawa City', 'Gurgura']
  },
  {
    name: 'Gambela',
    subRegions: ['Anywaa', 'Majang', 'Nuer', 'Itang']
  },
  {
    name: 'Harari',
    subRegions: ['Harar City']
  },
  {
    name: 'Oromia',
    subRegions: [
      'Adama (Special Zone)',
      'Arsi',
      'Bale',
      'Borena',
      'East Hararghe',
      'East Shewa',
      'East Wollega',
      'Guij',
      'Horo Guduru Wollega',
      'Illu Ababor',
      'Jimma',
      'Kellem Wollega',
      'North Shewa',
      'South West Shewa',
      'West Arsi',
      'West Guji',
      'West Hararghe',
      'West Shewa',
      'West Wollega'
    ]
  },
  {
    name: 'Sidama',
    subRegions: ['Hawassa (Special Zone)', 'Sidama Zone']
  },
  {
    name: 'Somali',
    subRegions: ['Afder', 'Dollo', 'Fafan', 'Jarar', 'Korahe', 'Liban', 'Nogob', 'Shabelle', 'Sitti']
  },
  {
    name: 'South West Ethiopia Peoples\' Region',
    subRegions: ['Bench Sheko', 'Dawro', 'Kaffa', 'Konta', 'Sheka', 'West Omo']
  },
  {
    name: 'Southern Nations, Nationalities, and Peoples\' Region (SNNPR)',
    subRegions: [
      'Gamo',
      'Gedeo',
      'Gofa',
      'Hadiya',
      'Halaba',
      'Kembata Tembaro',
      'Konso',
      'South Omo',
      'Wolayta',
      'Gurage',
      'Silte'
    ]
  },
  {
    name: 'Tigray',
    subRegions: ['Central Tigray', 'East Tigray', 'North West Tigray', 'South Tigray', 'South East Tigray', 'West Tigray', 'Mekelle (Special Zone)']
  }
];
