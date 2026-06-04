import { useEffect, useState } from 'react';
import type {
  Sort as HeadlessSort,
  SortBy,
  SortByFields,
  SortCriterion,
  SortState,
} from '@coveo/headless/commerce';

interface ISortProps {
  controller: HeadlessSort;
}

export default function Sort(props: ISortProps) {
  const { controller } = props;
  const [state, setState] = useState<SortState>(controller.state);

  useEffect(() => {
    const unsubscribe = controller.subscribe(() => {
      setState(controller.state);
    });
    return () => unsubscribe();
  }, [controller]);

  const getLabel = (criterion: SortCriterion): string => {
    switch (criterion.by) {
      case 'relevance' as SortBy:
        return 'Relevance';
      case 'fields' as SortBy:
        return (criterion as SortByFields).fields.map((field) => field.displayName).join(', ');
      default:
        return String(criterion.by);
    }
  };

  const handleChange = (value: string) => {
    controller.sortBy(JSON.parse(value));
  };

  // Build option values for each available sort, splitting multi-field entries
  // into individual field options.
  const options: { key: string; value: string; label: string }[] = [];
  for (let sortIndex = 0; sortIndex < state.availableSorts.length; sortIndex++) {
    const sort = state.availableSorts[sortIndex];
    if ((sort.by as SortBy) === 'fields') {
      const fieldSort = sort as SortByFields;
      for (let fieldIndex = 0; fieldIndex < fieldSort.fields.length; fieldIndex++) {
        const field = fieldSort.fields[fieldIndex];
        const criterion: SortCriterion = { by: 'fields' as SortBy, fields: [field] };
        options.push({
          key: `${sortIndex}-${fieldIndex}`,
          value: JSON.stringify(criterion),
          label: field.displayName ?? field.name,
        });
      }
    } else {
      options.push({
        key: String(sortIndex),
        value: JSON.stringify(sort),
        label: getLabel(sort),
      });
    }
  }

  // Find the matching option for the current appliedSort.
  // Can't use direct JSON.stringify comparison because the API response may
  // omit displayName on appliedSort while availableSorts includes it.
  const getSelectedValue = (): string => {
    const applied = state.appliedSort;
    if (applied.by === ('relevance' as SortBy)) {
      const match = options.find((o) => {
        const parsed = JSON.parse(o.value);
        return parsed.by === 'relevance';
      });
      return match?.value ?? options[0]?.value ?? '';
    }
    if (applied.by === ('fields' as SortBy)) {
      const appliedFields = (applied as SortByFields).fields;
      if (appliedFields.length > 0) {
        const af = appliedFields[0];
        const match = options.find((o) => {
          const parsed = JSON.parse(o.value);
          if (parsed.by !== 'fields' || !parsed.fields?.length) return false;
          const pf = parsed.fields[0];
          return pf.name === af.name && pf.direction === af.direction;
        });
        if (match) return match.value;
      }
    }
    return options[0]?.value ?? '';
  };

  if (state.availableSorts.length === 0) {
    return null;
  }

  return (
    <div className="row g-2 mb-3">
      <label htmlFor="sorts" className="col-auto col-form-label col-form-label-sm">
        Sort by:
      </label>
      <div className="col-auto">
        <select
          className="form-select form-select-sm"
          id="sorts"
          name="sorts"
          value={getSelectedValue()}
          onChange={(e) => handleChange(e.target.value)}
        >
          {options.map((opt) => (
            <option key={opt.key} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
