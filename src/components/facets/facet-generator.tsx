import { useEffect, useState } from 'react';
import type {
  FacetGenerator as HeadlessFacetGenerator,
  GeneratedFacetControllers,
} from '@coveo/headless/commerce';
import RegularFacet from './regular-facet.js';
import CategoryFacet from './category-facet.js';
import NumericFacet from './numeric-facet.js';
import DateFacet from './date-facet.js';

interface IFacetGeneratorProps {
  controller: HeadlessFacetGenerator;
}

export default function FacetGenerator(props: IFacetGeneratorProps) {
  const { controller } = props;
  const [facets, setFacets] = useState<GeneratedFacetControllers>(
    controller.facets
  );

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setFacets(controller.facets);
    });
    return () => unsubscribe();
  }, [controller]);

  if (facets.length === 0) {
    return null;
  }

  return (
    <nav>
      {facets.map((facetController) => {
        switch (facetController.type) {
          case 'regular':
            return (
              <RegularFacet
                key={facetController.state.facetId}
                controller={facetController}
              />
            );
          case 'numericalRange':
            return (
              <NumericFacet
                key={facetController.state.facetId}
                controller={facetController}
              />
            );
          case 'dateRange':
            return (
              <DateFacet
                key={facetController.state.facetId}
                controller={facetController}
              />
            );
          case 'hierarchical':
            return (
              <CategoryFacet
                key={facetController.state.facetId}
                controller={facetController}
              />
            );
          default:
            return (
              <div key={facetController.state.facetId} className="card small mb-3">
                <div className="card-body">
                  TODO: Implement [{facetController.type}] facet type component.
                </div>
              </div>
            );
        }
      })}
    </nav>
  );
}
