import localFont from 'next/font/local';

export const headingFont = localFont({
  src: './fonts/Momo_Trust_Display/MomoTrustDisplay-Regular.ttf',
  weight: '400',
  style: 'normal',
  display: 'swap',
  variable: '--font-heading',
});

export const bodyFont = localFont({
  src: [
    {path: './fonts/DM_Mono/DMMono-Light.ttf', weight: '300', style: 'normal'},
    {
      path: './fonts/DM_Mono/DMMono-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {path: './fonts/DM_Mono/DMMono-Medium.ttf', weight: '500', style: 'normal'},
    {
      path: './fonts/DM_Mono/DMMono-LightItalic.ttf',
      weight: '300',
      style: 'italic',
    },
    {path: './fonts/DM_Mono/DMMono-Italic.ttf', weight: '400', style: 'italic'},
    {
      path: './fonts/DM_Mono/DMMono-MediumItalic.ttf',
      weight: '500',
      style: 'italic',
    },
  ],
  display: 'swap',
  preload: false,
  variable: '--font-body',
  fallback: ['monospace'],
});
