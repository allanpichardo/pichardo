import type {Metadata} from 'next';
import {Styleguide} from '../../../components/Styleguide/Styleguide';

export const metadata: Metadata = {
  title: 'Styleguide | Allan Pichardo',
  description:
    'Typography, colors, elements, and content blocks for the artist site.',
  robots: {index: false, follow: false},
};

export default function StyleguidePage() {
  return <Styleguide />;
}
