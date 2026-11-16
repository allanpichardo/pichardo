import {getDocument} from '../../../../content/queries';
import {ContentDetail} from '../../../../components/ContentDetail/ContentDetail';
import {pageSEO} from '../../../../seo/page-seo';

type Props = {params: Promise<{slug: string}>};

export async function generateMetadata({params}: Props) {
  const doc = await getDocument('works', (await params).slug);
  return (await pageSEO({kind: 'works', doc})).metadata;
}

export default async function WorkPage({params}: Props) {
  const doc = await getDocument('works', (await params).slug);
  return <ContentDetail entry={{kind: 'works', doc}} />;
}
