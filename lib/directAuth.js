import { signInAnonymously } from 'firebase/auth';
import { jsAuth } from './firebase';
import { landAfterAuth } from './postAuthLanding';

export async function enterWithoutAuth(router) {
  let credential;

  try {
    credential = jsAuth.currentUser
      ? { user: jsAuth.currentUser }
      : await signInAnonymously(jsAuth);
  } catch (error) {
    return { error };
  }

  return landAfterAuth(router, credential.user.uid);
}
