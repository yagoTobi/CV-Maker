import { Amplify } from 'aws-amplify';
import outputs from '../amplify_outputs.json';

if (!outputs?.auth) {
  throw new Error('Amplify outputs missing — run: npx ampx generate outputs');
}

Amplify.configure(outputs);
