import {getDocument} from '../../../content/queries';
import {ContentDetail} from '../../../components/ContentDetail/ContentDetail';
import {pageSEO} from '../../../seo/page-seo';

type Props = {params: Promise<{slug: string}>};

export async function generateMetadata({params}: Props) {
  const doc = await getDocument('pages', (await params).slug);
  return (await pageSEO({kind: 'pages', doc})).metadata;
}

export default async function GeneralPage({params}: Props) {
  const doc = await getDocument('pages', (await params).slug);
  return <ContentDetail entry={{kind: 'pages', doc}} />;
}
