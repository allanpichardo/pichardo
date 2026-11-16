import {serializeGraph} from '../../seo/build-seo';
import type {buildSEO} from '../../seo/build-seo';

export function SEO({graph}: {graph: ReturnType<typeof buildSEO>['graph']}) {
  return (
    <script
      className="SEO"
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: serializeGraph(graph)}}
    />
  );
}
