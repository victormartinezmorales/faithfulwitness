// lib/geo.js — ZIP → state and ZIP → MSA resolution for partner geography.
//
// Data Promise: geography is surfaced at METRO (MSA) or STATE level only —
// never city, county, or ZIP. This module maps a participant ZIP to
// { state, msa } using 3-digit ZIP prefixes:
//   * State: complete USPS 3-digit prefix ranges (every US prefix).
//   * MSA: a curated table of ~40 major metros by their core 3-digit
//     prefixes. ZIPs outside the curated metros resolve to state only and
//     roll into "other MSAs" in the dashboard. Coarse by design: a coarser
//     mapping can never leak finer geography than the Data Promise allows.

'use strict';

// USPS 3-digit prefix ranges → state.
const STATE_RANGES = [
  ['005','005','NY'],['010','027','MA'],['028','029','RI'],['030','038','NH'],
  ['039','049','ME'],['050','059','VT'],['060','069','CT'],['070','089','NJ'],
  ['100','149','NY'],['150','196','PA'],['197','199','DE'],['200','205','DC'],
  ['206','219','MD'],['220','246','VA'],['247','268','WV'],['270','289','NC'],
  ['290','299','SC'],['300','319','GA'],['320','349','FL'],['350','369','AL'],
  ['370','385','TN'],['386','397','MS'],['398','399','GA'],['400','427','KY'],
  ['430','459','OH'],['460','479','IN'],['480','499','MI'],['500','528','IA'],
  ['530','549','WI'],['550','567','MN'],['570','577','SD'],['580','588','ND'],
  ['590','599','MT'],['600','629','IL'],['630','658','MO'],['660','679','KS'],
  ['680','693','NE'],['700','714','LA'],['716','729','AR'],['730','749','OK'],
  ['750','799','TX'],['800','816','CO'],['820','831','WY'],['832','838','ID'],
  ['840','847','UT'],['850','865','AZ'],['870','884','NM'],['885','885','TX'],
  ['889','898','NV'],['900','961','CA'],['967','968','HI'],['970','979','OR'],
  ['980','994','WA'],['995','999','AK'],['006','009','PR'],
];

// Curated major-metro prefixes (core counties' dominant prefixes).
const MSA_PREFIXES = {
  // prefix: [MSA display name, state]
  '450': ['Cincinnati', 'OH'], '451': ['Cincinnati', 'OH'], '452': ['Cincinnati', 'OH'],
  '410': ['Cincinnati', 'OH'], '470': ['Cincinnati', 'OH'],   // NKY + SE Indiana suburbs
  '430': ['Columbus', 'OH'], '432': ['Columbus', 'OH'],
  '441': ['Cleveland', 'OH'], '440': ['Cleveland', 'OH'],
  '453': ['Dayton', 'OH'], '454': ['Dayton', 'OH'],
  '402': ['Louisville', 'KY'],
  '460': ['Indianapolis', 'IN'], '462': ['Indianapolis', 'IN'],
  '606': ['Chicago', 'IL'], '607': ['Chicago', 'IL'], '608': ['Chicago', 'IL'], '604': ['Chicago', 'IL'], '605': ['Chicago', 'IL'],
  '480': ['Detroit', 'MI'], '482': ['Detroit', 'MI'],
  '553': ['Minneapolis–St. Paul', 'MN'], '554': ['Minneapolis–St. Paul', 'MN'], '551': ['Minneapolis–St. Paul', 'MN'],
  '631': ['St. Louis', 'MO'], '630': ['St. Louis', 'MO'],
  '641': ['Kansas City', 'MO'], '640': ['Kansas City', 'MO'], '661': ['Kansas City', 'KS'],
  '532': ['Milwaukee', 'WI'],
  '100': ['New York', 'NY'], '101': ['New York', 'NY'], '102': ['New York', 'NY'],
  '103': ['New York', 'NY'], '104': ['New York', 'NY'], '112': ['New York', 'NY'], '113': ['New York', 'NY'],
  '070': ['New York', 'NJ'], '071': ['New York', 'NJ'], '072': ['New York', 'NJ'], '073': ['New York', 'NJ'],
  '190': ['Philadelphia', 'PA'], '191': ['Philadelphia', 'PA'], '080': ['Philadelphia', 'NJ'],
  '152': ['Pittsburgh', 'PA'], '151': ['Pittsburgh', 'PA'],
  '021': ['Boston', 'MA'], '022': ['Boston', 'MA'], '024': ['Boston', 'MA'],
  '200': ['Washington', 'DC'], '202': ['Washington', 'DC'], '203': ['Washington', 'DC'],
  '208': ['Washington', 'MD'], '209': ['Washington', 'MD'], '220': ['Washington', 'VA'], '221': ['Washington', 'VA'],
  '212': ['Baltimore', 'MD'],
  '232': ['Richmond', 'VA'],
  '275': ['Raleigh–Durham', 'NC'], '276': ['Raleigh–Durham', 'NC'], '277': ['Raleigh–Durham', 'NC'],
  '282': ['Charlotte', 'NC'],
  '303': ['Atlanta', 'GA'], '300': ['Atlanta', 'GA'], '301': ['Atlanta', 'GA'], '302': ['Atlanta', 'GA'],
  '331': ['Miami', 'FL'], '330': ['Miami', 'FL'], '333': ['Miami', 'FL'],
  '328': ['Orlando', 'FL'], '327': ['Orlando', 'FL'],
  '336': ['Tampa', 'FL'], '335': ['Tampa', 'FL'],
  '370': ['Nashville', 'TN'], '372': ['Nashville', 'TN'],
  '381': ['Memphis', 'TN'],
  '350': ['Birmingham', 'AL'], '352': ['Birmingham', 'AL'],
  '700': ['New Orleans', 'LA'],
  '770': ['Houston', 'TX'], '772': ['Houston', 'TX'], '773': ['Houston', 'TX'], '774': ['Houston', 'TX'], '775': ['Houston', 'TX'],
  '750': ['Dallas–Fort Worth', 'TX'], '751': ['Dallas–Fort Worth', 'TX'], '752': ['Dallas–Fort Worth', 'TX'], '760': ['Dallas–Fort Worth', 'TX'], '761': ['Dallas–Fort Worth', 'TX'],
  '782': ['San Antonio', 'TX'],
  '787': ['Austin', 'TX'],
  '791': ['Amarillo', 'TX'],
  '798': ['El Paso', 'TX'], '799': ['El Paso', 'TX'], '885': ['El Paso', 'TX'],
  '730': ['Oklahoma City', 'OK'], '731': ['Oklahoma City', 'OK'],
  '800': ['Denver', 'CO'], '801': ['Denver', 'CO'], '802': ['Denver', 'CO'],
  '850': ['Phoenix', 'AZ'], '852': ['Phoenix', 'AZ'], '853': ['Phoenix', 'AZ'],
  '857': ['Tucson', 'AZ'],
  '871': ['Albuquerque', 'NM'],
  '891': ['Las Vegas', 'NV'], '890': ['Las Vegas', 'NV'],
  '841': ['Salt Lake City', 'UT'],
  '900': ['Los Angeles', 'CA'], '902': ['Los Angeles', 'CA'], '903': ['Los Angeles', 'CA'],
  '906': ['Los Angeles', 'CA'], '908': ['Los Angeles', 'CA'], '910': ['Los Angeles', 'CA'],
  '913': ['Los Angeles', 'CA'], '914': ['Los Angeles', 'CA'], '917': ['Los Angeles', 'CA'], '918': ['Los Angeles', 'CA'],
  '926': ['Orange County', 'CA'], '927': ['Orange County', 'CA'], '928': ['Orange County', 'CA'],
  '921': ['San Diego', 'CA'], '920': ['San Diego', 'CA'],
  '941': ['San Francisco Bay Area', 'CA'], '940': ['San Francisco Bay Area', 'CA'],
  '945': ['San Francisco Bay Area', 'CA'], '946': ['San Francisco Bay Area', 'CA'],
  '947': ['San Francisco Bay Area', 'CA'], '950': ['San Francisco Bay Area', 'CA'], '951': ['San Francisco Bay Area', 'CA'],
  '958': ['Sacramento', 'CA'], '956': ['Sacramento', 'CA'],
  '936': ['Fresno', 'CA'],
  '970': ['Portland', 'OR'], '972': ['Portland', 'OR'],
  '980': ['Seattle', 'WA'], '981': ['Seattle', 'WA'], '982': ['Seattle', 'WA'], '983': ['Seattle', 'WA'],
};

function resolveZip(zip) {
  const digits = String(zip || '').trim().match(/^(\d{5})/);
  if (!digits) return null;
  const prefix = digits[1].slice(0, 3);

  let state = null;
  for (const [lo, hi, st] of STATE_RANGES) {
    if (prefix >= lo && prefix <= hi) { state = st; break; }
  }
  if (!state) return null;

  const msa = MSA_PREFIXES[prefix] || null;
  return {
    state,
    msa: msa ? { city: msa[0], state: msa[1] } : null,
  };
}

module.exports = { resolveZip };
