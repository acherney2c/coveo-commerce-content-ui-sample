import { useEffect, useState } from 'react';
import type {
  BaseFacetValue,
  BreadcrumbManager as HeadlessBreadcrumbManager,
  BreadcrumbManagerState,
  BreadcrumbValue,
  CategoryFacetValue,
  DateFacetValue,
  NumericFacetValue,
  RegularFacetValue,
} from '@coveo/headless/commerce';

interface IBreadcrumbManagerProps {
  controller: HeadlessBreadcrumbManager;
}

export default function BreadcrumbManager(props: IBreadcrumbManagerProps) {
  const { controller } = props;
  const [state, setState] = useState<BreadcrumbManagerState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const deselect = (value: BreadcrumbValue<BaseFacetValue>) => {
    value.deselect();
  };

  const deselectAll = () => {
    controller.deselectAll();
  };

  const renderRegularFacet = (value: BaseFacetValue): string => {
    return (value as RegularFacetValue).value;
  };

  const renderNumericalFacet = (value: BaseFacetValue): string => {
    const numValue = value as NumericFacetValue;
    return `${numValue.start} - ${numValue.end}`;
  };

  const renderDateFacet = (value: BaseFacetValue): string => {
    const dateValue = value as DateFacetValue;
    return `${dateValue.start} - ${dateValue.end}`;
  };

  const renderHierarchicalFacet = (value: BaseFacetValue): string => {
    return (value as CategoryFacetValue).path.join(' > ');
  };

  const renderValue = (breadcrumb: typeof state.facetBreadcrumbs[0], value: BaseFacetValue): string => {
    switch (breadcrumb.type) {
      case 'regular':
        return renderRegularFacet(value);
      case 'numericalRange':
        return renderNumericalFacet(value);
      case 'dateRange':
        return renderDateFacet(value);
      case 'hierarchical':
        return renderHierarchicalFacet(value);
      default:
        return `TODO: Implement [${breadcrumb.type}] breadcrumb`;
    }
  };

  if (!state.hasBreadcrumbs) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="d-inline-block">
        <button
          className="btn btn-outline-secondary btn-sm mb-1 me-1"
          type="button"
          onClick={deselectAll}
        >
          Clear all filters
        </button>
      </div>
      <div className="d-inline-block">
        <ul className="nav">
          {state.facetBreadcrumbs.map((breadcrumb) => (
            <li key={breadcrumb.facetId} className="nav-item">
              {breadcrumb.values.map((value, index) => (
                <button
                  key={index}
                  className="btn btn-outline-secondary btn-sm mb-1 me-1"
                  type="button"
                  onClick={() => deselect(value)}
                >
                  {breadcrumb.facetDisplayName}: {renderValue(breadcrumb, value.value)}
                </button>
              ))}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
