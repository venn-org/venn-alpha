export const ENUMS = {
  user_type: {
    dbToUI: { 'seeking': 'seeking', 'owner': 'owner' },
    uiToDb: { 'seeking': 'seeking', 'owner': 'owner' }
  },
  gender: {
    dbToUI: { 'man': 'Man', 'woman': 'Woman', 'non_binary': 'Non-binary', 'prefer_not_to_say': 'Prefer not to say' },
    uiToDb: { 'Man': 'man', 'Woman': 'woman', 'Non-binary': 'non_binary', 'Prefer not to say': 'prefer_not_to_say' }
  },
  lifestyle: {
    dbToUI: { 'yes': 'Yes', 'sometimes': 'Sometimes', 'no': 'No', 'prefer_not_to_say': 'Prefer not to say' },
    uiToDb: { 'Yes': 'yes', 'Sometimes': 'sometimes', 'No': 'no', 'Prefer not to say': 'prefer_not_to_say' }
  },
  pref_role: {
    dbToUI: { 'seeking': '🔍 Looking for a flat', 'owner': '🏠 Have a flat / room' },
    uiToDb: { '🔍 Looking for a flat': 'seeking', '🏠 Have a flat / room': 'owner' }
  },
  pref_gender: {
    dbToUI: { 'women_only': '👩 Women only', 'men_only': '👨 Men only', 'any_gender': '🌈 Any gender' },
    uiToDb: { '👩 Women only': 'women_only', '👨 Men only': 'men_only', '🌈 Any gender': 'any_gender' }
  },
  pref_age: {
    dbToUI: { '18_22': '18–22', '22_26': '22–26', '26_30': '26–30', '30_35': '30–35', '35_plus': '35+', 'flexible': 'Flexible' },
    uiToDb: { '18–22': '18_22', '22–26': '22_26', '26–30': '26_30', '30–35': '30_35', '35+': '35_plus', 'Flexible': 'flexible' }
  },
  pref_budget: {
    dbToUI: { 'under_10k': 'Under ₹10k', '10k_20k': '₹10k–20k', '20k_35k': '₹20k–35k', '35k_50k': '₹35k–50k', '50k_plus': '₹50k+' },
    uiToDb: { 'Under ₹10k': 'under_10k', '₹10k–20k': '10k_20k', '₹20k–35k': '20k_35k', '₹35k–50k': '35k_50k', '₹50k+': '50k_plus' }
  },
  pref_move_in: {
    dbToUI: { 'asap': 'ASAP', 'jul_2026': 'Jul 2026', 'aug_2026': 'Aug 2026', 'sep_2026': 'Sep 2026', 'oct_2026': 'Oct 2026', 'flexible': 'Flexible' },
    uiToDb: { 'ASAP': 'asap', 'Jul 2026': 'jul_2026', 'Aug 2026': 'aug_2026', 'Sep 2026': 'sep_2026', 'Oct 2026': 'oct_2026', 'Flexible': 'flexible' }
  },
  flat_type: {
    dbToUI: { '1_bhk': '1 BHK', '2_bhk': '2 BHK', '3_bhk': '3 BHK', 'studio': 'Studio', 'private_room': 'Private room', 'shared_room': 'Shared room', 'pg': 'PG' },
    uiToDb: { '1 BHK': '1_bhk', '2 BHK': '2_bhk', '3 BHK': '3_bhk', 'Studio': 'studio', 'Private room': 'private_room', 'Shared room': 'shared_room', 'PG': 'pg' }
  },
  occupation: {
    dbToUI: { 'working_professional': '💼 Working professional', 'student': '🎓 Student', 'freelancer': '💻 Freelancer', 'entrepreneur': '🚀 Entrepreneur' },
    uiToDb: { '💼 Working professional': 'working_professional', '🎓 Student': 'student', '💻 Freelancer': 'freelancer', '🚀 Entrepreneur': 'entrepreneur' }
  },
  food_habit: {
    dbToUI: { 'veg_only': '🥦 Veg only', 'eggetarian_ok': '🍳 Eggetarian ok', 'non_veg_ok': '🍗 Non-veg ok', 'vegan_only': '🌱 Vegan only' },
    uiToDb: { '🥦 Veg only': 'veg_only', '🍳 Eggetarian ok': 'eggetarian_ok', '🍗 Non-veg ok': 'non_veg_ok', '🌱 Vegan only': 'vegan_only' }
  },
  smoking_pref: {
    dbToUI: { 'non_smoker': '🚭 Non-smoker', 'smoker_ok': '🚬 Smoker ok', 'outside_only': '🏠 Outside only' },
    uiToDb: { '🚭 Non-smoker': 'non_smoker', '🚬 Smoker ok': 'smoker_ok', '🏠 Outside only': 'outside_only' }
  },
  drinking_pref: {
    dbToUI: { 'teetotaller_only': '🚫 Teetotaller only', 'social_drinker_ok': '🍷 Social drinker ok', 'fine_with_drinking': '🍺 Fine with drinking' },
    uiToDb: { '🚫 Teetotaller only': 'teetotaller_only', '🍷 Social drinker ok': 'social_drinker_ok', '🍺 Fine with drinking': 'fine_with_drinking' }
  },
  pets_pref: {
    dbToUI: { 'have_pet': '🐶 I have a pet', 'fine_with_pets': '✅ Fine with pets', 'no_pets': '🚫 No pets please', 'allergic': '🤧 Allergic' },
    uiToDb: { '🐶 I have a pet': 'have_pet', '✅ Fine with pets': 'fine_with_pets', '🚫 No pets please': 'no_pets', '🤧 Allergic': 'allergic' }
  }
};

export function toDb(category, uiStr) {
  if (!uiStr) return uiStr;
  return ENUMS[category]?.uiToDb[uiStr] ?? uiStr;
}

export function toUI(category, dbStr) {
  if (!dbStr) return dbStr;
  return ENUMS[category]?.dbToUI[dbStr] ?? dbStr;
}

export function toDbArray(category, uiArr) {
  if (!Array.isArray(uiArr)) return uiArr;
  return uiArr.map(val => toDb(category, val)).filter(Boolean);
}

export function toUIArray(category, dbArr) {
  if (!Array.isArray(dbArr)) return dbArr;
  return dbArr.map(val => toUI(category, val)).filter(Boolean);
}

/** Parses DB row pref columns into UI mapped object */
export function mapDbPrefsToUI(me) {
  if (!me) return null;
  
  // Fallbacks for existing users who completed onboarding before we synced these.
  const fallbackRole = me.user_type === 'owner' ? 'seeking' : 'owner';
  const fallbackAreas = me.preferred_areas ?? [];
  const fallbackFlatType = me.flat_type ? [me.flat_type] : [];
  const fallbackBudget = me.budget ?? null;

  return {
    role:       toUI('pref_role', me.pref_role ?? fallbackRole),
    areas:      me.pref_areas && me.pref_areas.length > 0 ? me.pref_areas : fallbackAreas,
    flatType:   toUIArray('flat_type', me.pref_flat_type && me.pref_flat_type.length > 0 ? me.pref_flat_type : fallbackFlatType),
    budget:     toUI('pref_budget', me.pref_budget ?? fallbackBudget),
    moveIn:     toUI('pref_move_in', me.pref_move_in),
    gender:     toUI('pref_gender', me.pref_gender),
    age:        toUI('pref_age', me.pref_age),
    occupation: toUIArray('occupation', me.pref_occupation),
    food:       toUIArray('food_habit', me.pref_food),
    smoking:    toUI('smoking_pref', me.pref_smoking),
    drinking:   toUI('drinking_pref', me.pref_drinking),
    pets:       toUIArray('pets_pref', me.pref_pets),
  };
}

/** Prepares UI mapped object for saving to DB row */
export function mapUIPrefsToDb(p) {
  if (!p) return {};
  return {
    pref_role:       toDb('pref_role', p.role),
    pref_areas:      p.areas?.length ? p.areas : null,
    pref_flat_type:  toDbArray('flat_type', p.flatType)?.length ? toDbArray('flat_type', p.flatType) : null,
    pref_budget:     toDb('pref_budget', p.budget),
    pref_move_in:    toDb('pref_move_in', p.moveIn),
    pref_gender:     toDb('pref_gender', p.gender),
    pref_age:        toDb('pref_age', p.age),
    pref_occupation: toDbArray('occupation', p.occupation)?.length ? toDbArray('occupation', p.occupation) : null,
    pref_food:       toDbArray('food_habit', p.food)?.length ? toDbArray('food_habit', p.food) : null,
    pref_smoking:    toDb('smoking_pref', p.smoking),
    pref_drinking:   toDb('drinking_pref', p.drinking),
    pref_pets:       toDbArray('pets_pref', p.pets)?.length ? toDbArray('pets_pref', p.pets) : null,
  };
}
