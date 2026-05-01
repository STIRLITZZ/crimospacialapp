export const MONTHS_SHORT_RO = [
  "Ian",
  "Feb",
  "Mar",
  "Apr",
  "Mai",
  "Iun",
  "Iul",
  "Aug",
  "Sep",
  "Oct",
  "Noi",
  "Dec",
];

export const MONTHS_FULL_RO = [
  "Ianuarie",
  "Februarie",
  "Martie",
  "Aprilie",
  "Mai",
  "Iunie",
  "Iulie",
  "August",
  "Septembrie",
  "Octombrie",
  "Noiembrie",
  "Decembrie",
];

export const WEEKDAYS_SHORT_RO = [
  "Lun",
  "Mar",
  "Mie",
  "Joi",
  "Vin",
  "Sam",
  "Dum",
];

export const WEEKDAYS_FULL_RO = [
  "Luni",
  "Marti",
  "Miercuri",
  "Joi",
  "Vineri",
  "Sambata",
  "Duminica",
];

const RISK_LEVEL_LABELS = {
  very_low: "Foarte scazut",
  low: "Scazut",
  medium: "Mediu",
  high: "Ridicat",
  very_high: "Foarte ridicat",
};

const MODEL_TYPE_LABELS = {
  unknown: "Necunoscut",
};

const TREND_DIRECTION_LABELS = {
  Increasing: "In crestere",
  Decreasing: "In scadere",
  Stable: "Stabil",
};

const CRIME_TYPE_LABELS = {
  "CRIMINAL HOMICIDE": "Omucidere",
  "MANSLAUGHTER, NEGLIGENT": "Ucidere din culpa",
  "RAPE, FORCIBLE": "Viol",
  "RAPE, ATTEMPTED": "Tentativa de viol",
  ROBBERY: "Jaf",
  "ATTEMPTED ROBBERY": "Tentativa de jaf",
  "ASSAULT WITH DEADLY WEAPON, AGGRAVATED ASSAULT":
    "Atac cu arma letala / agresiune agravata",
  "ASSAULT WITH DEADLY WEAPON ON POLICE OFFICER":
    "Atac cu arma letala asupra unui politist",
  "CHILD ABUSE (PHYSICAL) - AGGRAVATED ASSAULT":
    "Abuz fizic asupra copilului - agresiune agravata",
  "INTIMATE PARTNER - AGGRAVATED ASSAULT":
    "Agresiune agravata asupra partenerului intim",
  BURGLARY: "Efractie",
  "BURGLARY FROM VEHICLE": "Furt prin efractie din vehicul",
  "BURGLARY FROM VEHICLE, ATTEMPTED":
    "Tentativa de furt prin efractie din vehicul",
  "BURGLARY, ATTEMPTED": "Tentativa de efractie",
  "THEFT FROM MOTOR VEHICLE - GRAND ($950.01 & OVER)":
    "Furt din autovehicul - valoare mare",
  "THEFT-GRAND ($950.01 & OVER)EXCPT,GUNS,FOWL,LIVESTK,PROD":
    "Furt major - bunuri diverse",
  "SHOPLIFTING-GRAND THEFT ($950.01 & OVER)":
    "Furt din magazin - valoare mare",
  "SHOPLIFTING - ATTEMPT": "Tentativa de furt din magazin",
  "SHOPLIFTING - PETTY THEFT ($950 & UNDER)":
    "Furt minor din magazin",
  "THEFT, PERSON": "Furt de la persoana",
  "THEFT FROM PERSON - ATTEMPT": "Tentativa de furt de la persoana",
  "PURSE SNATCHING": "Smulgere de geanta",
  "PURSE SNATCHING - ATTEMPT": "Tentativa de smulgere de geanta",
  PICKPOCKET: "Buzunarit",
  "PICKPOCKET, ATTEMPT": "Tentativa de buzunarit",
  "THEFT OF IDENTITY": "Furt de identitate",
  "THEFT FROM MOTOR VEHICLE - PETTY ($950 & UNDER)":
    "Furt din autovehicul - valoare mica",
  "THEFT FROM MOTOR VEHICLE - ATTEMPT":
    "Tentativa de furt din autovehicul",
  "THEFT FROM MOTOR VEHICLE - GRAND ($950.01 AND OVER)":
    "Furt din autovehicul - valoare mare",
  "THEFT PLAIN - PETTY ($950 & UNDER)": "Furt simplu - valoare mica",
  "THEFT PLAIN - ATTEMPT": "Tentativa de furt simplu",
  "THEFT, COIN MACHINE - ATTEMPT":
    "Tentativa de furt din automat cu monede",
  "THEFT, COIN MACHINE - GRAND ($950.01 & OVER)":
    "Furt din automat cu monede - valoare mare",
  "THEFT, COIN MACHINE - PETTY ($950 & UNDER)":
    "Furt din automat cu monede - valoare mica",
  "TILL TAP - GRAND THEFT ($950.01 & OVER)":
    "Furt din casa de marcat - valoare mare",
  "TILL TAP - PETTY ($950 & UNDER)":
    "Furt din casa de marcat - valoare mica",
  "BIKE - STOLEN": "Bicicleta furata",
  "BIKE - ATTEMPTED STOLEN": "Tentativa de furt de bicicleta",
  "BOAT - STOLEN": "Barca furata",
  "VEHICLE - STOLEN": "Vehicul furat",
  "VEHICLE, STOLEN - OTHER (MOTORIZED SCOOTERS, BIKES, ETC)":
    "Alt vehicul furat (scutere motorizate, biciclete etc.)",
  "VEHICLE - ATTEMPTED STOLEN": "Tentativa de furt de vehicul",
  "VEHICLE - ATTEMPT STOLEN": "Tentativa de furt de vehicul",
  "BATTERY - SIMPLE ASSAULT": "Agresiune simpla",
  "BATTERY ON A FIREFIGHTER": "Agresiune asupra unui pompier",
  "BATTERY POLICE (SIMPLE)": "Agresiune simpla asupra unui politist",
  "OTHER ASSAULT": "Alta agresiune",
  "INTIMATE PARTNER - SIMPLE ASSAULT":
    "Agresiune simpla asupra partenerului intim",
  "CHILD ABUSE (PHYSICAL) - SIMPLE ASSAULT":
    "Abuz fizic asupra copilului - agresiune simpla",
  "THROWING OBJECT AT MOVING VEHICLE":
    "Aruncare de obiecte asupra unui vehicul in miscare",
  ARSON: "Incendiere",
  "BOMB SCARE": "Alerta cu bomba",
  "DOCUMENT FORGERY / STOLEN FELONY":
    "Falsificare de documente / bunuri furate",
  "DOCUMENT WORTHLESS ($200 & UNDER)": "Document fara valoare - pana la $200",
  "DOCUMENT WORTHLESS ($200.01 & OVER)":
    "Document fara valoare",
  "CREDIT CARDS, FRAUD USE ($950.01 & OVER)":
    "Utilizare frauduloasa a cardurilor",
  "CREDIT CARDS, FRAUD USE ($950 & UNDER":
    "Utilizare frauduloasa a cardurilor - valoare mica",
  COUNTERFEIT: "Contrafacere",
  "UNAUTHORIZED COMPUTER ACCESS": "Acces neautorizat la calculator",
  BRIBERY: "Mituire",
  "CONSPIRACY": "Conspiratie",
  "BUNCO, GRAND THEFT": "Escrocherie, furt major",
  "BUNCO, PETTY THEFT": "Escrocherie, furt minor",
  "BUNCO, ATTEMPT": "Tentativa de escrocherie",
  "EMBEZZLEMENT, GRAND THEFT ($950.01 & OVER)":
    "Delapidare, furt major",
  "EMBEZZLEMENT, PETTY THEFT ($950 & UNDER)":
    "Delapidare, furt minor",
  "DEFRAUDING INNKEEPER/THEFT OF SERVICES, $950 & UNDER":
    "Fraudarea hotelierului / furt de servicii - valoare mica",
  "DEFRAUDING INNKEEPER/THEFT OF SERVICES, OVER $950.01":
    "Fraudarea hotelierului / furt de servicii - valoare mare",
  "DISHONEST EMPLOYEE - GRAND THEFT":
    "Angajat necinstit - furt major",
  "DISHONEST EMPLOYEE - PETTY THEFT":
    "Angajat necinstit - furt minor",
  "DISHONEST EMPLOYEE ATTEMPTED THEFT":
    "Angajat necinstit - tentativa de furt",
  "GRAND THEFT / AUTO REPAIR": "Furt major / reparatii auto",
  "GRAND THEFT / INSURANCE FRAUD": "Furt major / frauda de asigurare",
  "PETTY THEFT - AUTO REPAIR": "Furt minor / reparatii auto",
  "VANDALISM - FELONY ($400 & OVER)": "Vandalism grav",
  "VANDALISM - FELONY ($400 & OVER, ALL CHURCH VANDALISMS)":
    "Vandalism grav",
  "VANDALISM - MISDEMEANOR ($399 OR UNDER)": "Vandalism minor",
  "VANDALISM - MISDEAMEANOR ($399 OR UNDER)": "Vandalism minor",
  "DISCHARGE FIREARMS/SHOTS FIRED":
    "Folosire arma de foc / focuri trase",
  "SHOTS FIRED AT INHABITED DWELLING":
    "Focuri trase asupra unei locuinte ocupate",
  "SHOTS FIRED AT MOVING VEHICLE, TRAIN OR AIRCRAFT":
    "Focuri trase asupra unui vehicul in miscare, tren sau aeronava",
  "WEAPONS POSSESSION/BOMBING": "Detinere de arme / atentat cu bomba",
  "BRANDISH WEAPON": "Amenintare cu arma",
  "REPLICA FIREARMS(SALE,DISPLAY,MANUFACTURE OR DISTRIBUTE)":
    "Arme de foc replica (vanzare, expunere, fabricare sau distribuire)",
  "FIREARMS EMERGENCY PROTECTIVE ORDER (FIREARMS EPO)":
    "Ordin de protectie de urgenta privind armele de foc",
  "FIREARMS RESTRAINING ORDER (FIREARMS RO)":
    "Ordin de restrictie privind armele de foc",
  "LEWD CONDUCT": "Comportament obscen",
  STALKING: "Hartuire",
  "PEEPING TOM": "Voyeurism",
  "SEX, UNLAWFUL": "Act sexual ilegal",
  "SEX,UNLAWFUL(INC MUTUAL CONSENT, PENETRATION W/ FRGN OBJ":
    "Act sexual ilegal (incl. consimtamant mutual, penetrare cu obiect strain)",
  "CRM AGNST CHLD (13 OR UNDER)":
    "Infractiune impotriva copilului (13 ani sau sub)",
  "CRM AGNST CHLD (13 OR UNDER) (14-15 & SUSP 10 YRS OLDER)":
    "Infractiune impotriva copilului (13 ani sau sub / 14-15 ani cu suspect mult mai in varsta)",
  "SEXUAL PENETRATION W/FOREIGN OBJECT":
    "Penetrare sexuala cu obiect strain",
  "ORAL COPULATION": "Copulatie orala",
  "SODOMY/SEXUAL CONTACT B/W PENIS OF ONE PERS TO ANUS OTH":
    "Sodomie / contact sexual anal",
  EXTORTION: "Santaj",
  "SEX OFFENDER REGISTRANT OUT OF COMPLIANCE":
    "Infractor sexual neconform",
  "INDECENT EXPOSURE": "Exhibitionism",
  "BATTERY WITH SEXUAL CONTACT": "Agresiune cu contact sexual",
  "BEASTIALITY, CRIME AGAINST NATURE SEXUAL ASSLT WITH ANIM":
    "Bestialitate / agresiune sexuala impotriva naturii cu animale",
  BIGAMY: "Bigamie",
  "INCEST (SEXUAL ACTS BETWEEN BLOOD RELATIVES)": "Incest",
  PANDERING: "Racolarea pentru prostitutie",
  PIMPING: "Proxenetism",
  "CHILD NEGLECT (SEE 300 W.I.C.)": "Neglijare copil",
  "CHILD ABANDONMENT": "Abandon de copil",
  "CHILD ANNOYING (17YRS & UNDER)":
    "Hartuire a unui minor (17 ani sau sub)",
  "CHILD PORNOGRAPHY": "Pornografie infantila",
  "CHILD STEALING": "Rapire de copil",
  "LEWD/LASCIVIOUS ACTS WITH CHILD":
    "Acte obscene / lascive cu un copil",
  "DISRUPT SCHOOL": "Tulburarea activitatii scolare",
  "DISTURBING THE PEACE": "Tulburarea ordinii publice",
  "BLOCKING DOOR INDUCTION CENTER": "Blocarea usii centrului de primire",
  "CONTEMPT OF COURT": "Sfidarea instantei",
  CONTRIBUTING: "Complicitate",
  "DRUGS, TO A MINOR": "Droguri oferite unui minor",
  "FAILURE TO DISPERSE": "Refuz de dispersare",
  "FAILURE TO YIELD": "Neacordare de prioritate",
  "FALSE POLICE REPORT": "Raport fals catre politie",
  "INCITING A RIOT": "Instigare la revolta",
  PROWLER: "Suspect care da tarcoale proprietatii",
  "RECKLESS DRIVING": "Conducere imprudenta",
  "RESISTING ARREST": "Opunere la arestare",
  "TELEPHONE PROPERTY - DAMAGE": "Deteriorarea proprietatii telefonice",
  "TRAIN WRECKING": "Sabotaj feroviar",
  TRESPASSING: "Patrundere ilegala",
  "VIOLATION OF COURT ORDER": "Incalcarea ordinului instantei",
  "VIOLATION OF RESTRAINING ORDER": "Incalcarea ordinului de restrictie",
  "VIOLATION OF TEMPORARY RESTRAINING ORDER":
    "Incalcarea ordinului temporar de restrictie",
  KIDNAPPING: "Rapire",
  "KIDNAPPING - GRAND ATTEMPT": "Tentativa grava de rapire",
  "FALSE IMPRISONMENT": "Sechestrare ilegala",
  LYNCHING: "Linsaj",
  "LYNCHING - ATTEMPTED": "Tentativa de linsaj",
  "HUMAN TRAFFICKING - COMMERCIAL SEX ACTS":
    "Trafic de persoane - exploatare sexuala comerciala",
  "HUMAN TRAFFICKING - INVOLUNTARY SERVITUDE":
    "Trafic de persoane - servitute involuntara",
  "THREATENING PHONE CALLS/LETTERS":
    "Apeluri sau scrisori de amenintare",
  "CRIMINAL THREATS - NO WEAPON DISPLAYED":
    "Amenintari penale fara arma afisata",
  "CRUELTY TO ANIMALS": "Cruzime fata de animale",
  "DRUNK ROLL": "Jefuirea unei persoane in stare de ebrietate",
  "DRUNK ROLL - ATTEMPT":
    "Tentativa de jefuire a unei persoane in stare de ebrietate",
  "DRIVING WITHOUT OWNER CONSENT (DWOC)":
    "Conducere fara consimtamantul proprietarului",
  "ILLEGAL DUMPING": "Depozitare ilegala de deseuri",
  "OTHER MISCELLANEOUS CRIME": "Alta infractiune diversa",
  "LETTERS, LEWD - TELEPHONE CALLS, LEWD":
    "Scrisori / apeluri telefonice obscene",
  "LETTERS, LEWD  -  TELEPHONE CALLS, LEWD":
    "Scrisori / apeluri telefonice obscene",
  OTHER: "Altele",
  UNKNOWN: "Necunoscut",
  Unknown: "Necunoscut",
  Incident: "Incident",
};

function normalizeCrimeTypeKey(label) {
  return String(label || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

const NORMALIZED_CRIME_TYPE_LABELS = Object.fromEntries(
  Object.entries(CRIME_TYPE_LABELS).map(([key, value]) => [
    normalizeCrimeTypeKey(key),
    value,
  ])
);

function getCrimeTypeTranslation(label) {
  return NORMALIZED_CRIME_TYPE_LABELS[normalizeCrimeTypeKey(label)] || null;
}

function buildCrimeTypeLabel(label, { bilingual = false } = {}) {
  if (!label) return label;

  const value = String(label).trim();
  const codeMatch = value.match(/^(\d+\s*-\s*)(.+)$/);
  const prefix = codeMatch ? codeMatch[1] : "";
  const body = codeMatch ? codeMatch[2] : value;
  const translation = getCrimeTypeTranslation(body);

  if (!translation) {
    return `${prefix}${body}`;
  }

  if (!bilingual || normalizeCrimeTypeKey(translation) === normalizeCrimeTypeKey(body)) {
    return `${prefix}${translation}`;
  }

  return `${prefix}${translation} / ${body}`;
}

export function translateRiskLevel(level) {
  if (!level) return "N/A";
  return RISK_LEVEL_LABELS[level] || level;
}

export function translateCrimeType(label) {
  return buildCrimeTypeLabel(label);
}

export function translateCrimeTypeBilingual(label) {
  return buildCrimeTypeLabel(label, { bilingual: true });
}

export function translateModelType(modelType) {
  if (!modelType) return "Necunoscut";
  return MODEL_TYPE_LABELS[modelType] || modelType;
}

export function translateTrendDirection(direction) {
  if (!direction) return direction;
  return TREND_DIRECTION_LABELS[direction] || direction;
}

export function translateSamplingLabel(label) {
  if (!label) return "";
  if (label === "all points") return "toate punctele";

  const everyMatch = String(label).match(/^1 in (\d+)$/i);
  if (everyMatch) {
    return `1 din ${everyMatch[1]}`;
  }

  return label;
}
