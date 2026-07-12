import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

const isAuthDisabled = import.meta.env.VITE_DISABLE_AUTH === 'true';

if (!isAuthDisabled) {
  if (!outputs?.auth) {
    throw new Error('Amplify outputs missing — run: npx ampx generate outputs');
  }
  Amplify.configure(outputs);
}
