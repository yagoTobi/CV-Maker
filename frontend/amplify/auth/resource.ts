import { defineAuth } from '@aws-amplify/backend';

/**
 * Cognito authentication resource.
 *
 * Email-only sign-in for this milestone — no external identity providers
 * (Google / OAuth) and no secrets required, so `npx ampx generate outputs`
 * works on a clean checkout.
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
  },
});
