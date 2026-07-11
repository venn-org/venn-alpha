const { beforeUserCreated, beforeUserSignedIn } = require("firebase-functions/v2/identity");

/**
 * Firebase blocking functions to add custom claims to the JWT.
 * 
 * Supabase requires the custom claim `role: 'authenticated'` to exist in the JWT.
 * If this claim is not present, Supabase will reject the token or apply the 'anon' role,
 * meaning Row Level Security (RLS) policies will fail.
 * 
 * NOTE: Blocking functions require upgrading to Firebase Authentication with Identity Platform.
 * You can do this in the Firebase Console under Authentication -> Settings.
 */

// Runs before a new user is saved to the Firebase database.
exports.beforecreated = beforeUserCreated((event) => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});

// Runs before a user successfully signs in.
// We apply it here too in case an existing user's claims need to be refreshed
// or if they were created before this function was deployed.
exports.beforesignedin = beforeUserSignedIn((event) => {
  return {
    customClaims: {
      role: 'authenticated',
    },
  };
});
